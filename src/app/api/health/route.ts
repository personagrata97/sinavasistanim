import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // DB bağlantı kontrolü
    const userCount = await prisma.user.count()
    const courseCount = await prisma.course.count()
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      stats: { users: userCount, courses: courseCount },
      env: {
        gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        nextauth: !!process.env.NEXTAUTH_SECRET,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    }, { status: 503 })
  }
}
