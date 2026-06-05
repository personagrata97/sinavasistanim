import { Target, BookOpen, Layers, HelpCircle, BarChart3, Clock, Trophy, CalendarDays } from "lucide-react"

export const COURSE_TABS = [
  { id: "overview", label: "Genel", icon: Target },
  { id: "notes", label: "Ders Notları", icon: BookOpen },
  { id: "flashcards", label: "Flashcard", icon: Layers },
  { id: "questions", label: "Sorular", icon: HelpCircle },
  { id: "coverage", label: "Kapsam", icon: BarChart3 },
  { id: "mock_exam", label: "Deneme", icon: Clock },
  { id: "achievements", label: "Rozet", icon: Trophy },
  { id: "goals", label: "Program", icon: CalendarDays }
]
