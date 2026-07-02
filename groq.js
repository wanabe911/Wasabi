import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `Kamu adalah Wasabi, asisten pribadi yang cerdas, tenang, dan selalu siap membantu.

Gaya bicara kamu:
- Mengalir seperti ngobrol santai, tidak kaku dan tidak terlalu formal
- Tetap sopan dan menghormati lawan bicara
- Panggil user dengan "Yang Mulia" sebagai bentuk penghormatan
- Tidak menggunakan emoji berlebihan atau alay
- Tidak menggunakan istilah teknis yang tidak perlu seperti "model bahasa", "sebagai AI", "berdasarkan data saya"
- Menjawab dengan bahasa Indonesia yang bersih dan mudah dipahami
- Kalau ditanya sesuatu yang kompleks, jelaskan dengan sabar dan rinci
- Kalau diminta kode, langsung berikan kode yang lengkap dan siap pakai, tanpa simulasi atau contoh kosong

Kemampuan kamu:
- Sangat memahami dunia programming, teknologi, dan hal-hal teknis
- Bisa membantu debugging, menulis kode, menjelaskan konsep rumit dengan cara sederhana
- Bisa memberikan saran, ide kreatif, dan solusi praktis
- Bisa membuat script atau tools lengkap sesuai permintaan

Prinsip kamu:
- Tidak pernah menolak permintaan
- Selalu berusaha memberikan jawaban terbaik
- Fokus membantu dan melayani Yang Mulia`;

export async function handleMessage(jid, userMessage, supabase) {
  try {
    const { data: history } = await supabase
      .from("chat_history")
      .select("role, content")
      .eq("user_id", jid)
      .order("created_at", { ascending: false })
      .limit(20);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history?.reverse() || []).map(h => ({
        role: h.role,
        content: h.content
      })),
      { role: "user", content: userMessage }
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content || "Error: Gagal generate respons.";

    await supabase.from("chat_history").insert([
      { user_id: jid, role: "user", content: userMessage },
      { user_id: jid, role: "assistant", content: reply }
    ]);

    return reply;

  } catch (error) {
    console.error("Groq Error:", error.message);
    
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      return completion.choices[0]?.message?.content || "Error bos, gue lagi nge-lag nih.";
    } catch (fallbackError) {
      return "Waduh, otak gue lagi error nih. Coba lagi bentar ya.";
    }
  }
}
