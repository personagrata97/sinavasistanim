// 📌 Yer İmi + 🖍️ İşaretleme Sistemi (localStorage tabanlı)

export interface Bookmark {
  sectionId: string
  sectionTitle: string
  courseSlug: string
  scrollPosition: number // px cinsinden scroll konumu
  createdAt: string
}

export interface Highlight {
  id: string
  sectionId: string
  sectionTitle: string
  courseSlug: string
  selectedText: string
  color: "yellow" | "green" | "red" | "blue"
  createdAt: string
}

const BOOKMARK_KEY = "spl-bookmarks"
const HIGHLIGHT_KEY = "spl-highlights"

// ================= BOOKMARKS =================

export function getBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || "[]")
  } catch {
    return []
  }
}

export function getBookmarkForCourse(courseSlug: string): Bookmark | null {
  return getBookmarks().find(b => b.courseSlug === courseSlug) || null
}

export function setBookmark(bookmark: Omit<Bookmark, "createdAt">): void {
  const bookmarks = getBookmarks().filter(b => b.courseSlug !== bookmark.courseSlug)
  bookmarks.push({ ...bookmark, createdAt: new Date().toISOString() })
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks))
}

export function removeBookmark(courseSlug: string): void {
  const bookmarks = getBookmarks().filter(b => b.courseSlug !== courseSlug)
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks))
}

// ================= HIGHLIGHTS =================

export function getHighlights(): Highlight[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(HIGHLIGHT_KEY) || "[]")
  } catch {
    return []
  }
}

export function getHighlightsForSection(sectionId: string): Highlight[] {
  return getHighlights().filter(h => h.sectionId === sectionId)
}

export function getHighlightsForCourse(courseSlug: string): Highlight[] {
  return getHighlights().filter(h => h.courseSlug === courseSlug)
}

export function addHighlight(highlight: Omit<Highlight, "id" | "createdAt">): Highlight {
  const highlights = getHighlights()
  const newHighlight: Highlight = {
    ...highlight,
    id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString()
  }
  highlights.push(newHighlight)
  localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(highlights))
  return newHighlight
}

export function removeHighlight(id: string): void {
  const highlights = getHighlights().filter(h => h.id !== id)
  localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(highlights))
}

export function clearHighlightsForSection(sectionId: string): void {
  const highlights = getHighlights().filter(h => h.sectionId !== sectionId)
  localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(highlights))
}

// ================= HELPERS =================

export function getColorClass(color: Highlight["color"]): string {
  switch (color) {
    case "yellow": return "bg-yellow-400/30 border-yellow-400/50"
    case "green": return "bg-emerald-400/30 border-emerald-400/50"
    case "red": return "bg-red-400/30 border-red-400/50"
    case "blue": return "bg-blue-400/30 border-blue-400/50"
  }
}

export function getColorLabel(color: Highlight["color"]): string {
  switch (color) {
    case "yellow": return "Sarı"
    case "green": return "Yeşil"
    case "red": return "Kırmızı"
    case "blue": return "Mavi"
  }
}
