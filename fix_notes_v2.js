const fs = require('fs');

const GROQ_API_KEY = "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";

const systemPrompt = `Sen SPL (Sermaye Piyasası Lisanslama) sınavlarına hazırlanan adaylar için profesyonel bir ders notu hazırlayıcısısın.
Sana verilen kaynak metni, adayların en kolay öğrenebileceği şekilde "Sınav Kartı" formatında özetleyeceksin.

KURALLAR:
1. SADECE Markdown formatında çıktı ver.
2. Metni 3-4 mantıksal alt başlığa böl (## 1. Alt Başlık, ## 2. Alt Başlık vb.)
3. ÖNEMLİ: Mutlaka günlük hayattan akılda kalıcı, eğlenceli ve mantıklı örnekler ver! Örnekleri → 💡 işaretiyle belirt.
4. Başlıkların altına maddeler halinde (bullet points) hap bilgiler yaz.
5. Asla laf kalabalığı yapma.`;

async function regenerateNote(rawContent) {
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

async function run() {
  const lines = fs.readFileSync('raw_contents.txt', 'utf-8').split('\n').filter(l => l.trim().length > 0);
  const updates = [];
  
  for (const line of lines) {
    const splitIndex = line.indexOf('|||');
    if (splitIndex === -1) continue;
    const id = line.substring(0, splitIndex);
    // Unquote the sqlite quoted string (very basic parsing)
    let rawContent = line.substring(splitIndex + 3);
    if (rawContent.startsWith("'") && rawContent.endsWith("'")) {
      rawContent = rawContent.substring(1, rawContent.length - 1).replace(/''/g, "'");
    }
    
    console.log(`Regenerating notes for ${id}...`);
    const notes = await regenerateNote(rawContent);
    if (notes) {
      updates.push(`UPDATE Section SET notes = '${notes.replace(/'/g, "''")}' WHERE id = '${id}';`);
    }
  }
  
  fs.writeFileSync('update_notes.sql', updates.join('\n'));
  console.log("update_notes.sql generated.");
}

run();
