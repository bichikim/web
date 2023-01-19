import {PrismaClient} from '@prisma/client'

export type PrismaContext = PrismaClient

export const preparePrisma = () => {
  const prisma: PrismaClient = new PrismaClient()
  return () => prisma
}
