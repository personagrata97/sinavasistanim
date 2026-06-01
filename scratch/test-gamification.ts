import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkModels() {
  const models = Object.keys(prisma)
  console.log("Mevcut Modeller:", models.filter(m => !m.startsWith('_')))
}

checkModels()
