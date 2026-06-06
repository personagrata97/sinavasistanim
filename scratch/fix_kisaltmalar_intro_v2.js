const fs = require('fs');
const { execSync } = require('child_process');

let raw = execSync('sqlite3 dev.db "SELECT notes FROM Section WHERE title=\'Kısaltmalar\'"').toString();

let clean = raw.replace(/Bu bölüm.*?basit ve net bir sözlüktür\./g, "Bu bölümde, müfredatta yer alan teknik kısaltmalar ve terimler listelenmektedir.");

let escapedFinalMd = clean.replace(/'/g, "''");
let updateCmd = `sqlite3 dev.db "UPDATE Section SET notes = '${escapedFinalMd}' WHERE title = 'Kısaltmalar';"`;
execSync(updateCmd);
console.log("DB intro cleaned for real!");
