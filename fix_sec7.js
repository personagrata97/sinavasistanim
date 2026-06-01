const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dev.db');
const GEMINI_API_KEY = "AIzaSyDXW_Wtn9ycZJpbYx0x8tNAfiObPpmzxo8";

const systemPrompt = `Sen SPL (Sermaye Piyasası Lisanslama) MASAK Uyum Görevlisi sınavlarına hazırlanan adaylar için profesyonel bir ders notu hazırlayıcısısın.
Sana verilen kaynak metni, adayların en kolay öğrenebileceği şekilde "Sınav Kartı" formatında özetleyeceksin.

KURALLAR:
1. SADECE Markdown formatında çıktı ver.
2. Metni 3-4 mantıksal alt başlığa böl (## 1. Alt Başlık, ## 2. Alt Başlık vb.)
3. ÖNEMLİ: Mutlaka günlük hayattan akılda kalıcı, eğlenceli ve mantıklı örnekler ver! Örnekleri → 💡 işaretiyle belirt.
4. Başlıkların altına maddeler halinde (bullet points) hap bilgiler yaz. Asla laf kalabalığı yapma.
5. KAYNAK METİN dışına ÇIKMA.
6. Hiçbir şekilde "Üzgünüm", "Eksik metin", "Hata" gibi şeyler yazma.`;

async function regenerateNote(rawContent) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `[SİSTEM TALİMATI]\n${systemPrompt}\n\n[KULLANICI SORUSU]\nKAYNAK METİN:\n\n${rawContent.substring(0, 30000)}` }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8000
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    } else {
        console.log(data);
    }
    return null;
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
}

db.serialize(() => {
  db.all(`SELECT id, rawContent FROM Section WHERE id = 'cmpcxth0w00bnrip1362o4hdu'`, async (err, rows) => {
    if (err) throw err;
    for (const row of rows) {
      console.log(`Generating for ${row.id}...`);
      const notes = await regenerateNote(row.rawContent);
      if (notes) {
         db.run(`UPDATE Section SET notes = ? WHERE id = ?`, [notes, row.id], function(err) {
            if (err) console.error("Update error:", err);
            else console.log(`Successfully updated ${row.id} with ${notes.length} chars!`);
         });
      } else {
         console.log(`Failed for ${row.id}`);
      }
    }
  });
});
