import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    const body = await req.json()
    const { type = "client", message, path, stackTrace } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const errorRecord = await prisma.systemError.create({
      data: {
        type,
        message: message.substring(0, 1000), // Protect against massive payloads
        path: path?.substring(0, 200),
        userId: session?.user?.email || "anonymous",
        stackTrace: stackTrace?.substring(0, 2000),
      },
    })

    return NextResponse.json({ success: true, id: errorRecord.id })
  } catch (error) {
    console.error("Error logging failed:", error)
    // Don't crash if the logger itself fails
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
