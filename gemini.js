import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function handleGenerateImage(prompt, supabase, userId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp-image-generation" });

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: `Buatkan gambar realistis dengan detail maksimal: ${prompt}. Output langsung gambarnya tanpa teks tambahan.` }]
      }],
      generationConfig: {
        temperature: 0.9,
        topP: 1,
        topK: 40,
        maxOutputTokens: 8192,
        responseModalities: ["image", "text"]
      }
    });

    const response = result.response;
    let imageData = null;
    let responseText = "";

    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("image/")) {
          imageData = part.inlineData.data;
        } else if (part.text) {
          responseText += part.text;
        }
      }
    }

    if (imageData) {
      const buffer = Buffer.from(imageData, "base64");
      
      const fileName = `generated_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, buffer, {
          contentType: "image/png",
          cacheControl: "3600"
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      await supabase.from("image_history").insert({
        user_id: userId,
        prompt: prompt,
        image_url: urlData.publicUrl,
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        imageUrl: urlData.publicUrl,
        text: responseText || prompt
      };
    }

    return { success: false, error: "Gagal generate gambar" };

  } catch (error) {
    console.error("Gemini Image Error:", error.message);
    return { success: false, error: error.message };
  }
}
