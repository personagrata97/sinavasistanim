const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.section.findFirst({
    where: { 
      course: { slug: "masak-uyum-gorevlisi" },
      order: 1
    }
  });

  console.log("=== VERIFICATION ISSUES FOR SECTION 1 ===");
  if (s.verificationIssues) {
    const data = JSON.parse(s.verificationIssues);
    console.log("Final Score:", s.verificationScore);
    console.log("\nAttempt History:");
    data.attemptHistory.forEach((att) => {
      console.log(`\n--- Attempt #${att.attempt} (Score: ${att.score}%) ---`);
      console.log("Missing Topics:", att.missingTopics);
      console.log("Issues:", att.issues);
      console.log("Suggestions/Recommendations:", att.suggestions);
    });
  } else {
    console.log("No verification issues found in database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
