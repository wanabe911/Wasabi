import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { lookupPrefix } from "../data/prefix.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const NUMVERIFY_KEY = process.env.NUMVERIFY_KEY;
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;
const VERIPHONE_KEY = process.env.VERIPHONE_KEY;
const IPSTACK_KEY = process.env.IPSTACK_KEY;

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString();
}

async function lookupNumVerify(phone) {
  try {
    const res = await fetch(`http://apilayer.net/api/validate?access_key=${NUMVERIFY_KEY}&number=${phone}&country_code=ID`);
    const data = await res.json();
    if (data.valid) return { operator: data.carrier, region: data.location, line_type: data.line_type };
    return null;
  } catch { return null; }
}

async function lookupAbstract(phone) {
  try {
    const res = await fetch(`https://phoneintelligence.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&phone=${phone}`);
    const data = await res.json();
    if (data.phone_validation?.is_valid) {
      const loc = data.phone_location || {};
      const car = data.phone_carrier || {};
      const risk = data.phone_risk || {};
      return {
        operator: car.name,
        region: loc.region || loc.country_name,
        country: loc.country_name,
        timezone: loc.timezone,
        line_type: car.line_type,
        risk_level: risk.risk_level,
        is_abuse_detected: risk.is_abuse_detected
      };
    }
    return null;
  } catch { return null; }
}

async function lookupVeriphone(phone) {
  try {
    const cleaned = phone.replace(/[^0-9]/g, "");
    const res = await fetch(`https://api.veriphone.io/v2/verify?key=${VERIPHONE_KEY}&phone=%2B${cleaned}`);
    const data = await res.json();
    if (data.phone_valid) return { operator: data.carrier, region: data.phone_region || data.country, line_type: data.phone_type };
    return null;
  } catch { return null; }
}

async function lookupIpstack(ip) {
  try {
    const res = await fetch(`http://api.ipstack.com/${ip}?access_key=${IPSTACK_KEY}`);
    const data = await res.json();
    if (data.ip) {
      return {
        ip: data.ip,
        country: data.country_name,
        region: data.region_name,
        city: data.city,
        zip: data.zip,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.time_zone?.id,
        isp: data.connection?.isp
      };
    }
    return null;
  } catch { return null; }
}

app.post("/api/register", async (req, res) => {
  const { email, password, name, city } = req.body;
  if (!email || !password || !name || !city) return res.status(400).json({ error: "Semua field harus diisi" });

  const { data: exist } = await supabase.from("users").select("id").eq("email", email).single();
  if (exist) return res.status(400).json({ error: "Email sudah terdaftar" });

  const { error } = await supabase.from("users").insert({
    email, password: hash(password), name, city
  });
  if (error) return res.status(500).json({ error: "Gagal mendaftar" });

  res.json({ success: true });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase.from("users").select("*").eq("email", email).eq("password", hash(password)).single();
  if (!user) return res.status(401).json({ error: "Email atau password salah" });
  res.json({ success: true, user: { email: user.email, name: user.name, city: user.city } });
});

app.get("/api/ip", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "8.8.8.8";
  const data = await lookupIpstack(ip);
  res.json({ success: true, data });
});

app.post("/api/track", async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "Input diperlukan" });

  const cleaned = input.trim();
  const isPhone = /^[0-9+\-() ]+$/.test(cleaned) && cleaned.replace(/[^0-9]/g, "").length >= 8;
  const isEmail = cleaned.includes("@") && cleaned.includes(".");
  
  if (!isPhone && !isEmail) return res.status(400).json({ error: "Masukkan nomor HP atau email yang valid" });

  const result = { input, type: isPhone ? "phone" : "email", timestamp: new Date().toISOString() };

  if (isPhone) {
    const phone = cleaned.replace(/[^0-9+]/g, "");
    result.phone_formatted = phone.startsWith("+") ? phone : "+" + phone.replace(/^\+/, "");
    const prefixData = lookupPrefix(phone);
    result.prefix = prefixData;

    const [numverify, abstract, veriphone] = await Promise.all([
      lookupNumVerify(phone), lookupAbstract(phone), lookupVeriphone(phone)
    ]);
    result.apis = { numverify, abstract, veriphone };
    result.merged = {
      operator: numverify?.operator || abstract?.operator || veriphone?.operator || prefixData.operator,
      region: numverify?.region || abstract?.region || veriphone?.region || prefixData.wilayah,
      country: abstract?.country || "Indonesia",
      timezone: abstract?.timezone || null,
      line_type: numverify?.line_type || abstract?.line_type || veriphone?.line_type || prefixData.jenis,
      risk_level: abstract?.risk_level || null,
      is_abuse_detected: abstract?.is_abuse_detected || false
    };
  } else {
    result.email_domain = cleaned.split("@")[1];
  }

  const { data: tracked } = await supabase.from("tracked_numbers").select("*")
    .or(`phone.eq.${input},email.eq.${input}`).single();

  if (tracked) {
    result.tracked = tracked;
    await supabase.from("tracked_numbers").update({
      searched_count: tracked.searched_count + 1, updated_at: new Date()
    }).eq("id", tracked.id);
  }

  res.json({ success: true, data: result });
});

app.post("/api/report", async (req, res) => {
  const { phone, name, labels, location, notes, risk_level, reporter_name, reporter_city } = req.body;
  if (!phone) return res.status(400).json({ error: "Nomor diperlukan" });

  const { data: exist } = await supabase.from("tracked_numbers").select("id").eq("phone", phone).single();
  if (exist) {
    await supabase.from("tracked_numbers").update({
      name, labels, location, notes, risk_level, reports: exist.reports + 1, updated_at: new Date()
    }).eq("id", exist.id);
  } else {
    await supabase.from("tracked_numbers").insert({
      phone, name, labels: labels ? labels.split(",").map(l => l.trim()) : [], location, notes, risk_level, reports: 1, added_by: reporter_name, reporter_city
    });
  }
  res.json({ success: true });
});

app.get("/api/recent", async (req, res) => {
  const { data } = await supabase.from("tracked_numbers").select("*").order("updated_at", { ascending: false }).limit(10);
  res.json({ success: true, data });
});

app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: "." });
});

export default app;
