const fs = require('fs');
const { execSync } = require('child_process');

let raw = execSync('sqlite3 dev.db "SELECT notes FROM Section WHERE title=\'Kısaltmalar\'"').toString();
let clean = raw.replace("Kaynak metnin ilk sayfasında yer alan tüm kısaltmaların listesini aşağıda bulabilirsiniz.", "");

let escapedFinalMd = clean.replace(/'/g, "''");
let updateCmd = `sqlite3 dev.db "UPDATE Section SET notes = '${escapedFinalMd}' WHERE title = 'Kısaltmalar';"`;
execSync(updateCmd);
console.log("DB cleaned!");
