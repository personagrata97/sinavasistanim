const fs = require('fs');

const servicePath = './src/lib/ai-service.ts';
let code = fs.readFileSync(servicePath, 'utf8');

const flashcardsNew = fs.readFileSync('./scratch/generate_flashcards_new.ts', 'utf8');
const questionsNew = fs.readFileSync('./scratch/generate_questions_new.ts', 'utf8');

// Replace generateFlashcards
const flashStart = code.indexOf('export async function generateFlashcards(');
const questionStart = code.indexOf('export async function generateQuestions(');
const verifyStart = code.indexOf('export async function verifyNotesAgainstSource(');

if (flashStart !== -1 && questionStart !== -1 && verifyStart !== -1) {
  const beforeFlash = code.substring(0, flashStart);
  const afterQuestions = code.substring(verifyStart);
  
  // Notice that questionStart is after flashStart, and verifyStart is after questionStart.
  // We replace the region from flashStart to verifyStart with our two new functions.
  
  const newCode = beforeFlash + flashcardsNew + '\n\n// ==================== QUESTION GENERATION ====================\n\n' + questionsNew + '\n\n// ==================== AI KONTROLÖR (NOTES CROSS-CHECK) ====================\n\n' + afterQuestions;
  
  fs.writeFileSync(servicePath, newCode);
  console.log("Patch applied successfully!");
} else {
  console.log("Could not find function signatures!");
}
