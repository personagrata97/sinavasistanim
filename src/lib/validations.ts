import { z } from "zod"

// ==================== AUTH ====================
export const loginSchema = z.object({
  email: z.string().email("Geçerli e-posta adresi giriniz").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(128),
})

export const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı").max(100).trim(),
  email: z.string().email("Geçerli e-posta adresi giriniz").max(255),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı").max(128),
})

// ==================== CHAT ====================
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(10000, "Mesaj 10.000 karakteri aşamaz"),
})

export const chatRequestSchema = z.object({
  courseId: z.string().min(1, "courseId boş olamaz").max(100),
  messages: z.array(chatMessageSchema).max(50, "En fazla 50 mesaj gönderilebilir"),
})

// ==================== COURSE ====================
export const slugSchema = z.string()
  .min(1, "Slug boş olamaz")
  .max(100, "Slug 100 karakteri aşamaz")
  .regex(/^[a-z0-9-]+$/, "Slug sadece küçük harf, rakam ve tire içerebilir")

export const courseIdSchema = z.string().min(1).max(100)

// ==================== UPLOAD ====================
export const uploadSchema = z.object({
  courseId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().max(100 * 1024 * 1024, "Dosya boyutu 100MB'ı aşamaz"),
})

// ==================== QUESTION ANSWER ====================
export const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1).max(500),
})

// ==================== FLASHCARD REVIEW ====================
export const reviewSchema = z.object({
  flashcardId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
})

// ==================== MOCK EXAM ====================
export const mockExamResultSchema = z.object({
  courseId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  empty: z.number().int().min(0),
  timeUsed: z.number().int().min(0),
  passed: z.boolean(),
  weakAreas: z.array(z.string()),
})

// ==================== EXAM DATE ====================
export const examDateSchema = z.object({
  courseId: z.string().min(1),
  examDate: z.string().datetime().nullable(),
})

// ==================== REPORT QUESTION ====================
export const reportQuestionSchema = z.object({
  questionId: z.string().min(1),
  reason: z.string().max(500).optional(),
})

// Helper: validate and return parsed data or error
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error.issues.map(i => i.message).join(", ") }
}
