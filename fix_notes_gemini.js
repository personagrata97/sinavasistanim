const fs = require('fs');

const GEMINI_API_KEY = "AIzaSyDXW_Wtn9ycZJpbYx0x8tNAfiObPpmzxo8";

const systemPrompt = `Sen SPL (Sermaye Piyasası Lisanslama) MASAK Uyum Görevlisi sınavlarına hazırlanan adaylar için profesyonel bir ders notu hazırlayıcısısın.
Sana verilen kaynak metni, adayların en kolay öğrenebileceği şekilde "Sınav Kartı" formatında özetleyeceksin.

KURALLAR:
1. SADECE Markdown formatında çıktı ver.
2. Metni 3-4 mantıksal alt başlığa böl (## 1. Alt Başlık, ## 2. Alt Başlık vb.)
3. ÖNEMLİ: Mutlaka günlük hayattan akılda kalıcı, eğlenceli ve mantıklı örnekler ver! Örnekleri → 💡 işaretiyle belirt.
4. Başlıkların altına maddeler halinde (bullet points) hap bilgiler yaz. Asla laf kalabalığı yapma.
5. KAYNAK METİN dışına ÇIKMA. Kaynak metindeki tüm oranları, süreleri, para cezalarını ve kurum adlarını koru.`;

async function regenerateNote(rawContent) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `[SİSTEM TALİMATI]\n${systemPrompt}\n\n[KULLANICI SORUSU]\nKAYNAK METİN:\n\n${rawContent.substring(0, 30000)}` }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 6000
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) {
       console.error("Gemini API Error:", data.error.message);
       // Fallback to 1.5 flash
       const url15 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
       const response15 = await fetch(url15, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
       });
       const data15 = await response15.json();
       if (data15.error) {
           console.error("Gemini 1.5 API Error:", data15.error.message);
           return null;
       }
       return data15.candidates[0].content.parts[0].text;
    }
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    }
    return null;
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
    
    let rawContent = line.substring(splitIndex + 3);
    if (rawContent.startsWith("'") && rawContent.endsWith("'")) {
      rawContent = rawContent.substring(1, rawContent.length - 1).replace(/''/g, "'");
    }
    
    console.log(`Regenerating notes for ${id} with Gemini...`);
    const notes = await regenerateNote(rawContent);
    if (notes) {
      console.log(`Success! Length: ${notes.length}`);
      updates.push(`UPDATE Section SET notes = '${notes.replace(/'/g, "''")}' WHERE id = '${id}';`);
    } else {
      console.log(`Failed for ${id}`);
    }
  }
  
  fs.writeFileSync('update_notes_gemini.sql', updates.join('\n'));
  console.log("update_notes_gemini.sql generated.");
}

run();
