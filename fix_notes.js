const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const GROQ_API_KEY = "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";
const db = new sqlite3.Database('dev.db');

const systemPrompt = `Sen SPL (Sermaye Piyasası Lisanslama) sınavlarına hazırlanan adaylar için profesyonel bir ders notu hazırlayıcısısın.
Sana verilen kaynak metni, adayların en kolay öğrenebileceği şekilde "Sınav Kartı" formatında özetleyeceksin.

KURALLAR:
1. SADECE Markdown formatında çıktı ver.
2. Metni 3-4 mantıksal alt başlığa böl (## 1. Alt Başlık, ## 2. Alt Başlık vb.)
3. ÖNEMLİ: Mutlaka günlük hayattan akılda kalıcı, eğlenceli ve mantıklı örnekler ver! Örnekleri → 💡 işaretiyle belirt.
4. Başlıkların altına maddeler halinde (bullet points) hap bilgiler yaz.
5. Asla laf kalabalığı yapma.`;

async function regenerateNote(id, rawContent) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `KAYNAK METİN:\n\n${rawContent.substring(0, 20000)}` }
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: messages,
        temperature: 0.3,
        max_tokens: 6000,
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error("Groq Error:", data);
      return null;
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
}

db.all("SELECT id, title, rawContent FROM Section WHERE id IN ('cmpcxth0w00bmrip1ah2eg62i', 'cmpcxth0w00bnrip1362o4hdu', 'cmpcxth0x00borip1w3lzpu8l');", async (err, rows) => {
  if (err) throw err;
  
  for (const row of rows) {
    console.log(`Processing: ${row.title}`);
    const notes = await regenerateNote(row.id, row.rawContent);
    if (notes) {
      db.run("UPDATE Section SET notes = ? WHERE id = ?", [notes, row.id], function(err) {
        if (err) console.error("DB Update Error:", err);
        else console.log(`Successfully updated ${row.title}`);
      });
    }
  }
});
