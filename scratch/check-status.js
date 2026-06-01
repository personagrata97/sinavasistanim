const Database = require('better-sqlite3');
const db = new Database('dev.db');

const course = db.prepare("SELECT id, status FROM Course WHERE slug = 'bd-bilgi-sistemleri-guvenligi'").get();
if (!course) {
  console.log('Course not found');
  process.exit(0);
}
console.log('--- KURS DURUMU ---');
console.log('Course Status:', course.status);

const sections = db.prepare('SELECT title, processed, verificationScore, length(notes) as noteLen FROM Section WHERE courseId = ? ORDER BY "order" ASC').all(course.id);
console.log('\n--- BÖLÜM DURUMLARI ---');
console.table(sections);

const questions = db.prepare('SELECT COUNT(*) as cnt FROM Question WHERE courseId = ?').get(course.id);
const flashcards = db.prepare('SELECT COUNT(*) as cnt FROM Flashcard WHERE courseId = ?').get(course.id);
console.log('\n--- ÜRETİLEN MATERYALLER ---');
console.log('Toplam Soru:', questions.cnt);
console.log('Toplam Flashcard:', flashcards.cnt);
