/**
 * Ortam değişkeni doğrulama
 * Uygulama başlangıcında çağrılır, eksik env var'ları yakalar
 */

type EnvVar = {
  key: string
  required: boolean
  description: string
}

const ENV_VARS: EnvVar[] = [
  { key: "NEXTAUTH_SECRET", required: true, description: "JWT şifreleme anahtarı" },
  { key: "NEXTAUTH_URL", required: true, description: "Uygulama URL'i" },
  { key: "DATABASE_URL", required: true, description: "Veritabanı bağlantısı" },
  { key: "GOOGLE_GENERATIVE_AI_API_KEY", required: true, description: "Gemini API anahtarı" },
  { key: "GEMINI_API_KEYS", required: false, description: "Çoklu Gemini API anahtarları (virgülle ayrılmış)" },
]

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key]
    if (!value) {
      if (envVar.required) {
        errors.push(`❌ ${envVar.key} eksik — ${envVar.description}`)
      } else {
        warnings.push(`⚠️ ${envVar.key} tanımlı değil — ${envVar.description}`)
      }
    }
  }

  // NEXTAUTH_SECRET güvenlik kontrolü
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length < 32) {
    warnings.push("⚠️ NEXTAUTH_SECRET çok kısa (min 32 karakter önerilir)")
  }

  // Production-specific checks
  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXTAUTH_URL?.startsWith("https://")) {
      warnings.push("⚠️ Production'da NEXTAUTH_URL https:// ile başlamalı")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Sunucu başlangıcında çağır
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  const result = validateEnv()
  if (result.warnings.length > 0) {
    console.log("[ENV] Uyarılar:")
    result.warnings.forEach(w => console.log(`  ${w}`))
  }
  if (!result.valid) {
    console.error("[ENV] KRİTİK HATALAR:")
    result.errors.forEach(e => console.error(`  ${e}`))
    if (process.env.NODE_ENV === "production") {
      throw new Error("Eksik ortam değişkenleri — uygulama başlatılamıyor")
    }
  }
}
