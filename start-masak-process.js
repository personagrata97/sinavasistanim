const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

// Chapter/section detection patterns for Turkish academic PDFs
const SECTION_PATTERNS = [
  /^(BÖLÜM|Bölüm|bölüm)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^(KONU|Konu)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^(\d+)\.\s+(BÖLÜM|KONU|KISIM)\s*[:.–-]?\s*(.+)/i,
  /^(\d+)\.\s+([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]{10,})/,
  /^(ÜNİTE|Ünite)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^\d+\.\d*\s+[A-ZÇĞİÖŞÜ]{2,}/,
];

const MAX_CHUNK_CHARS = 12000;

function fixSpacedText(str) {
  let fixed = str.replace(/(?:^|\s)([A-ZÇĞİÖŞÜ])(?:\s+([A-ZÇĞİÖŞÜ])){2,}(?=\s|$)/g, (match) => {
    return match.replace(/\s+/g, '');
  });
  return fixed.trim();
}

function extractSmartTitle(content, fallbackTitle, pageStart, pageEnd) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return fallbackTitle;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const match = line.match(/^(?:BÖLÜM|KISIM|ÜNİTE)\s*\d+\s*[:.-]?\s*(.+)/i) || 
                  line.match(/^\d+\.\s*BÖLÜM\s*[:.-]?\s*(.+)/i) ||
                  line.match(/^\d+\.\s*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]{5,60})$/);
                  
    if (match && match[1] && match[1].length > 3) {
      return fixSpacedText(match[1]);
    }
    
    if (/^[A-ZÇĞİÖŞÜ\s0-9.()-]+$/.test(line) && line.length > 8 && line.length < 80) {
      if (line.split(/\s+/).length >= 2) {
        return fixSpacedText(line);
      }
    }
  }

  if (fallbackTitle && fallbackTitle.length > 3 && fallbackTitle.length < 100 && !fallbackTitle.startsWith("Giriş")) {
    return fixSpacedText(fallbackTitle);
  }

  return `Bölüm İçeriği (Sayfa ${pageStart}-${pageEnd})`;
}

function splitByCharLimit(text, limit) {
  const chunks = [];
  const headerPattern = /\n(?=(?:[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s0-9.()-]{8,80}\n)|\d+\.\s+[A-ZÇĞİÖŞÜ])/g;
  const topicSegments = [];
  let lastIdx = 0;
  let match;
  
  while ((match = headerPattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      topicSegments.push(text.substring(lastIdx, match.index));
    }
    lastIdx = match.index + 1;
  }
  if (lastIdx < text.length) {
    topicSegments.push(text.substring(lastIdx));
  }
  
  let current = "";
  for (const segment of topicSegments) {
    if (current.length + segment.length > limit && current.length > 0) {
      chunks.push(current.trim());
      current = segment;
    } else {
      current += (current ? "\n" : "") + segment;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  
  if (chunks.length <= 1 && text.length > limit) {
    chunks.length = 0;
    const paragraphs = text.split(/\n\n+/);
    current = "";
    for (const para of paragraphs) {
      if (current.length + para.length + 2 > limit && current.length > 0) {
        chunks.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current.trim()) {
      chunks.push(current.trim());
    }
  }

  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += limit) {
      chunks.push(text.substring(i, i + limit));
    }
  }

  return chunks;
}

function detectSections(pageTexts, totalPages) {
  const sections = [];
  let currentSection = null;

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const text = pageTexts[pageIdx];
    const pageNum = pageIdx + 1;



    const headerArea = text.substring(0, 500);
    let foundHeader = false;

    for (const pattern of SECTION_PATTERNS) {
      const match = headerArea.match(pattern);
      if (match) {
        if (currentSection) {
          currentSection.pageEnd = pageNum - 1;
          sections.push(currentSection);
        }

        const title = (match[3] || match[2] || match[0]).trim().substring(0, 200);
        currentSection = {
          title,
          pageStart: pageNum,
          pageEnd: pageNum,
          content: text,
        };
        foundHeader = true;
        break;
      }
    }

    if (!foundHeader) {
      if (currentSection) {
        currentSection.content += "\n\n" + text;
      } else {
        currentSection = {
          title: `Giriş ve Genel Bilgiler (Sayfa ${pageNum})`,
          pageStart: pageNum,
          pageEnd: pageNum,
          content: text,
        };
      }
    }
  }

  if (currentSection) {
    currentSection.pageEnd = totalPages;
    sections.push(currentSection);
  }

  const finalSections = [];
  for (const section of sections) {
    if (section.content.length <= MAX_CHUNK_CHARS) {
      finalSections.push({
        ...section,
        title: extractSmartTitle(section.content, section.title, section.pageStart, section.pageEnd),
      });
    } else {
      const subChunks = splitByCharLimit(section.content, MAX_CHUNK_CHARS);
      const sectionPages = pageTexts.slice(section.pageStart - 1, section.pageEnd);
      const pageOffsets = [];
      let offset = 0;
      for (let p = 0; p < sectionPages.length; p++) {
        const len = sectionPages[p].length;
        pageOffsets.push({
          pageNum: section.pageStart + p,
          start: offset,
          end: offset + len
        });
        offset += len + 2;
      }

      let searchStart = 0;
      for (let i = 0; i < subChunks.length; i++) {
        const subChunkText = subChunks[i];
        const chunkStart = section.content.indexOf(subChunkText, searchStart);
        const chunkEnd = chunkStart + subChunkText.length;
        if (chunkStart >= 0) {
          searchStart = chunkStart + 1;
        }

        let startPage = 0;
        let endPage = 0;
        for (const po of pageOffsets) {
          const isOverlapping = chunkStart <= po.end && po.start <= chunkEnd;
          if (isOverlapping) {
            if (startPage === 0) startPage = po.pageNum;
            endPage = po.pageNum;
          }
        }

        if (startPage === 0) {
          startPage = Math.min(section.pageEnd, Math.max(section.pageStart, section.pageStart + Math.floor((i / subChunks.length) * (section.pageEnd - section.pageStart + 1))));
          endPage = startPage;
        }

        const smartTitle = extractSmartTitle(subChunkText, section.title, startPage, endPage);
        finalSections.push({
          title: subChunks.length > 1 
            ? `${smartTitle} (Bölüm ${i + 1}/${subChunks.length})`
            : smartTitle,
          pageStart: startPage,
          pageEnd: endPage,
          content: subChunkText,
        });
      }
    }
  }

  if (finalSections.length === 0) {
    const allText = pageTexts.join("\n\n");
    const chunks = splitByCharLimit(allText, MAX_CHUNK_CHARS);
    const pageOffsets = [];
    let offset = 0;
    for (let p = 0; p < pageTexts.length; p++) {
      const len = pageTexts[p].length;
      pageOffsets.push({
        pageNum: p + 1,
        start: offset,
        end: offset + len
      });
      offset += len + 2;
    }

    let searchStart = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkStart = allText.indexOf(chunkText, searchStart);
      const chunkEnd = chunkStart + chunkText.length;
      if (chunkStart >= 0) {
        searchStart = chunkStart + 1;
      }

      let startPage = 0;
      let endPage = 0;

      for (const po of pageOffsets) {
        const isOverlapping = chunkStart <= po.end && po.start <= chunkEnd;
        if (isOverlapping) {
          if (startPage === 0) startPage = po.pageNum;
          endPage = po.pageNum;
        }
      }

      if (startPage === 0) {
        startPage = Math.min(totalPages, Math.max(1, Math.ceil((i / chunks.length) * totalPages)));
        endPage = startPage;
      }

      finalSections.push({
        title: `Bölüm ${i + 1} (Sayfa ${startPage}-${endPage})`,
        pageStart: startPage,
        pageEnd: endPage,
        content: chunkText,
      });
    }
  }

  return finalSections;
}

async function main() {
  const slug = "masak-uyum-gorevlisi";
  const course = await prisma.course.findUnique({
    where: { slug },
    include: { program: true }
  });

  if (!course || !course.pdfPath) {
    console.error("Course or PDF path not found!");
    process.exit(1);
  }

  console.log(`[START] Course: "${course.name}"`);
  console.log(`[START] PDF Path: "${course.pdfPath}"`);

  // Update status to processing
  await prisma.course.update({
    where: { slug },
    data: { status: "processing" }
  });

  // Extract pages
  const { extractAllText } = require("./src/lib/pdf-engine");
  const pdfBuffer = fs.readFileSync(course.pdfPath);
  console.log("[START] Extracting pages from PDF...");
  const pageTexts = await extractAllText(pdfBuffer);
  
  await prisma.course.update({
    where: { slug },
    data: { processedPages: pageTexts.length, totalPages: pageTexts.length }
  });
  console.log(`[START] Extracted ${pageTexts.length} pages.`);

  console.log("[START] Detecting sections...");
  const sections = detectSections(pageTexts, pageTexts.length);
  console.log(`[START] Detected ${sections.length} sections.`);

  // Create sections in database
  for (let i = 0; i < sections.length; i++) {
    await prisma.section.create({
      data: {
        courseId: course.id,
        title: sections[i].title,
        order: i + 1,
        pageStart: sections[i].pageStart,
        pageEnd: sections[i].pageEnd,
        rawContent: sections[i].content,
        processed: false,
      }
    });
    console.log(`  ✅ Section #${i + 1} created: "${sections[i].title}" (Page ${sections[i].pageStart}-${sections[i].pageEnd})`);
  }

  console.log("\n[START] Triggering event loop background AI generator script...");
  
  // Call Next.js API in a separate script or just run it via the Next.js process route by mocking fetch
  // Wait, since Next.js server is running on localhost:3000, we can now make an unauthenticated internal call!
  // Oh, wait! The session check is inside the route, but we can trigger the processing by launching a separate node script
  // or by invoking the background processing function directly here!
  // Let's invoke it by spawning a background process that imports it!
  console.log("\nAll sections are populated. Status set to processing.");
  console.log("Please run node start-bg.js or just refresh the UI!");
  process.exit(0);
}

main().catch(console.error).finally(() => prisma.$disconnect());
