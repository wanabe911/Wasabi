import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason 
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { handleMessage } from "./groq.js";
import { handleGenerateImage } from "./gemini.js";

export async function createBot(supabase) {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: ["Wasabi Bot", "Chrome", "2.0.0"],
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === "close") {
      const shouldReconnect = 
        (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log("Koneksi putus, reconnect:", shouldReconnect);
      if (shouldReconnect) {
        createBot(supabase);
      }
    } else if (connection === "open") {
      console.log("Bot WA berhasil terhubung!");
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const jid = msg.key.remoteJid;
    
    let text = msg.message.conversation || 
               msg.message.extendedTextMessage?.text || 
               msg.message.imageMessage?.caption || "";
    
    if (msg.message.imageMessage && text) {
      const caption = text.toLowerCase();
      
      if (caption.includes("gambar") || caption.includes("generate") || caption.includes("bikin")) {
        await sock.sendMessage(jid, { text: "Tunggu bentar, lagi bikin gambarnya..." });
        const imageResult = await handleGenerateImage(text, supabase, jid);
        
        if (imageResult?.success && imageResult?.imageUrl) {
          await sock.sendMessage(jid, { 
            image: { url: imageResult.imageUrl },
            caption: `Nih gambarnya!\nPrompt: ${text}`
          });
          return;
        } else {
          await sock.sendMessage(jid, { text: "Gagal generate gambar, coba lagi nanti." });
          return;
        }
      }
    }
    
    if (!text) return;
    
    console.log(`Pesan dari ${jid}: ${text.substring(0, 100)}`);
    
    await sock.sendPresenceUpdate("composing", jid);
    
    const response = await handleMessage(jid, text, supabase);
    
    await sock.sendMessage(jid, { text: response });
    
    await sock.sendPresenceUpdate("available", jid);
  });

  return { sock };
}
