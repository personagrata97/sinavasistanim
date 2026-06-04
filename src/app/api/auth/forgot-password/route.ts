import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/emailService"
import { logger } from "@/lib/logger"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "E-posta adresi gereklidir" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Güvenlik: Kullanıcı bulunamasa bile "Gönderildi" diyoruz ki email enumeration yapılmasın
    if (!user) {
      // Sadece logla, ama kullanıcıya çaktırma
      logger.warn(`Şifre sıfırlama denendi ama e-posta bulunamadı: ${email}`)
      return NextResponse.json({ success: true, message: "E-posta gönderildi" })
    }

    // Token üret (64 karakter hex)
    const resetToken = crypto.randomBytes(32).toString("hex")
    
    // Güvenlik için token'ı veritabanında hash'li saklamak best-practice'dir
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Token'ı DB'ye kaydet (1 saat geçerli)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 saat
      },
    })

    // E-postayı gönder (şifrelenmemiş token gidecek, URL'de)
    await sendPasswordResetEmail(user.email!, resetToken)

    logger.info(`Şifre sıfırlama maili gönderildi: ${user.email}`)

    return NextResponse.json({ success: true, message: "E-posta gönderildi" })
  } catch (error: any) {
    logger.error("Şifre sıfırlama talebi hatası", error)
    return NextResponse.json({ error: "İşlem sırasında bir hata oluştu" }, { status: 500 })
  }
}
