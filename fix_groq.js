const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./dev.db');
const GROQ_API_KEY = "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";

const systemPrompt = `Sen SPL (Sermaye Piyasası Lisanslama) MASAK Uyum Görevlisi sınavlarına hazırlanan adaylar için profesyonel bir ders notu hazırlayıcısısın.
Sana verilen kaynak metni, adayların en kolay öğrenebileceği şekilde "Sınav Kartı" formatında özetleyeceksin.

KURALLAR:
1. SADECE Markdown formatında çıktı ver. Herhangi bir giriş (Örn: "İşte notlar") veya çıkış cümlesi YAZMA. SADECE içeriği yaz.
2. Başlığı kesinlikle şu formatta at:
## 📌 [BÖLÜMÜN ANA KONUSU]

### 🎯 Bu Bölüm Ne Anlatıyor?
[Kısa bir özet]
3. Metni 3-4 mantıksal alt başlığa böl (### Konu 1, ### Konu 2 vb.)
4. ÖNEMLİ: Mutlaka günlük hayattan akılda kalıcı, eğlenceli ve mantıklı örnekler ver! Örnekleri → 💡 işaretiyle belirt.
5. Başlıkların altına maddeler halinde (bullet points) hap bilgiler yaz.
6. KAYNAK METİN dışına ÇIKMA.`;

async function regenerateNoteWithGroq(rawContent) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `KAYNAK METİN:\n\n${rawContent.substring(0, 15000)}` }
        ],
        temperature: 0.1,
        max_tokens: 6000,
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0].message.content) {
      // Clean up any potential intro conversational text Groq might still add
      let text = data.choices[0].message.content;
      text = text.replace(/^[\s\S]*?(## 📌)/, '$1');
      return text;
    } else {
        console.log(data);
    }
    return null;
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
}

const sectionIds = ['cmpcxth0w00bmrip1ah2eg62i', 'cmpcxth0w00bnrip1362o4hdu', 'cmpcxth0x00borip1w3lzpu8l'];

db.serialize(() => {
  db.all(`SELECT id, rawContent FROM Section WHERE id IN (?, ?, ?)`, sectionIds, async (err, rows) => {
    if (err) throw err;
    for (const row of rows) {
      console.log(`Generating for ${row.id}...`);
      const notes = await regenerateNoteWithGroq(row.rawContent);
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
