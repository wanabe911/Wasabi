import express from "express";
import { createBot } from "./bot.js";
import { initSupabase } from "./supabase.js";

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = initSupabase();
const botInstance = await createBot(supabase);

app.use(express.json());

app.get("/health", (req, res) => {
  const status = botInstance.sock?.user ? "connected" : "disconnected";
  res.status(200).json({
    status: "ok",
    bot: status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Wasabi Bot",
    version: "2.0.0",
    owner: "RICC",
    status: botInstance.sock?.user ? "ONLINE" : "RECONNECTING"
  });
});

app.listen(PORT, () => {
  console.log(`Server nyala di port ${PORT}`);
});
