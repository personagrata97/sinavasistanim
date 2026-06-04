/**
 * Mock E-posta Servisi (İleride SendGrid / Resend vb. eklenecek)
 * 
 * Şimdilik e-postaları göndermeyip terminalde logluyor.
 * "E-posta doğrulama" özelliği geldiğinde bu dosya üzerinden entegre edilecek.
 */

export async function sendPasswordResetEmail(email: string, token: string) {
  // Gerçek projede base URL ortam değişkeninden alınır
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3010"
  const resetLink = `${baseUrl}/reset-password?token=${token}`

  console.log("\n========================================================")
  console.log("✉️ MOCK E-POSTA GÖNDERİLDİ")
  console.log(`Kime: ${email}`)
  console.log(`Konu: Sınav Asistanım - Şifre Sıfırlama Talebi`)
  console.log(`Mesaj:`)
  console.log(`Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:`)
  console.log(`${resetLink}`)
  console.log(`(Bu bağlantı 1 saat boyunca geçerlidir)`)
  console.log("========================================================\n")

  // İleride buraya SendGrid/Resend API çağrısı gelecek:
  // await resend.emails.send({ ... })
  
  return { success: true, message: "E-posta gönderildi" }
}
