import { extractAllText } from '../src/lib/pdf-engine'
import { readFileSync } from 'fs'

async function checkPages() {
  const pdfPath = '/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/uploads/bd-bilgi-sistemleri-guvenligi-1780685931397.pdf'
  const buffer = readFileSync(pdfPath)
  console.log("Buffer length:", buffer.length)
  const text = await extractAllText(buffer)
  
  for (let i = 5; i < 15; i++) {
    const pageText = text[i].content || ''
    console.log(`Page ${i} (1-indexed: ${i+1}):`, pageText.substring(0, 200).replace(/\n/g, ' '))
  }
}
checkPages().catch(console.error)
