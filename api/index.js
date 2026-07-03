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

async function lookupNumVerify(phone) {
  try {
    const res = await fetch(`http://apilayer.net/api/validate?access_key=${NUMVERIFY_KEY}&number=${phone}&country_code=ID`);
    const data = await res.json();
    if (data.valid) {
      return { operator: data.carrier, region: data.location, line_type: data.line_type };
    }
    return null;
  } catch { return null; }
}

async function lookupAbstract(phone) {
  try {
    const res = await fetch(`https://phoneintelligence.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&phone=${phone}`);
    const data = await res.json();
    if (data.phone_validation?.is_valid) {
      return {
        operator: data.phone_carrier?.name,
        region: data.phone_location?.city || data.phone_location?.country_name,
        line_type: data.phone_carrier?.line_type
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
    if (data.phone_valid) {
      return {
        operator: data.carrier,
        region: data.phone_region || data.country,
        line_type: data.phone_type
      };
    }
    return null;
  } catch { return null; }
}

function detectInputType(input) {
  const cleaned = input.trim();
  if (/^[0-9+\-() ]+$/.test(cleaned) && cleaned.replace(/[^0-9]/g, "").length >= 8) {
    return "phone";
  }
  if (cleaned.includes("@") && cleaned.includes(".")) {
    return "email";
  }
  return "unknown";
}

app.post("/api/track", async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: "Input diperlukan" });

  const type = detectInputType(input);
  if (type === "unknown") {
    return res.status(400).json({ error: "Masukkan nomor HP atau email yang valid" });
  }

  const result = {
    input,
    type,
    timestamp: new Date().toISOString()
  };

  if (type === "phone") {
    const phone = input.replace(/[^0-9+]/g, "");
    if (!phone.startsWith("+")) result.phone_formatted = "+" + phone.replace(/^\+/, "");
    else result.phone_formatted = phone;

    const prefixData = lookupPrefix(phone);
    result.prefix = prefixData;

    const [numverify, abstract, veriphone] = await Promise.all([
      lookupNumVerify(phone),
      lookupAbstract(phone),
      lookupVeriphone(phone)
    ]);

    result.apis = { numverify, abstract, veriphone };
    result.merged = {
      operator: numverify?.operator || abstract?.operator || veriphone?.operator || prefixData.operator,
      region: numverify?.region || abstract?.region || veriphone?.region || prefixData.wilayah,
      line_type: numverify?.line_type || abstract?.line_type || veriphone?.line_type || prefixData.jenis
    };
  }

  if (type === "email") {
    const email = input.trim().toLowerCase();
    result.email_domain = email.split("@")[1];
    result.email_provider = result.email_domain?.split(".")[0];

    const commonProviders = {
      "gmail": "Google", "yahoo": "Yahoo", "outlook": "Microsoft", "hotmail": "Microsoft",
      "icloud": "Apple", "protonmail": "Proton", "ymail": "Yahoo"
    };
    result.email_provider_name = commonProviders[result.email_provider] || "Unknown";
  }

  const { data: tracked } = await supabase
    .from("tracked_numbers")
    .select("*")
    .or(`phone.eq.${input},email.eq.${input}`)
    .single();

  if (tracked) {
    result.tracked = tracked;
    await supabase.from("tracked_numbers").update({
      searched_count: tracked.searched_count + 1,
      updated_at: new Date()
    }).eq("id", tracked.id);
  }

  res.json({ success: true, data: result });
});

app.get("/api/recent", async (req, res) => {
  const { data } = await supabase
    .from("tracked_numbers")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(10);
  res.json({ success: true, data });
});

app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: "." });
});

export default app;
