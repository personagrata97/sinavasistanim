const Database = require('better-sqlite3');
const db = new Database('dev.db');

const course = db.prepare("SELECT id FROM Course WHERE name LIKE '%Bilgi Sistemleri Güvenliği%'").get();
if (!course) {
  console.log('Course not found');
  process.exit(1);
}

const sections = db.prepare('SELECT id, "order", title, processed, verificationScore FROM Section WHERE courseId = ? ORDER BY "order" ASC').all(course.id);
console.table(sections);

// Reset Section 2
const sec2 = sections.find((s: any) => s.order === 2);
if (sec2) {
  db.prepare("UPDATE Section SET processed = 0, notes = NULL, summary = NULL, verificationScore = NULL, verificationIssues = NULL WHERE id = ?").run(sec2.id);
  console.log(`Reset Section 2: ${sec2.title}`);
}

db.prepare("UPDATE Course SET status = 'processing' WHERE id = ?").run(course.id);
console.log('Course status set to processing');

