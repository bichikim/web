import {PrismaClient} from '@prisma/client'
import {ContextFunction} from './types'
import {ExpressContext} from 'apollo-server-express'
import {freeze} from '@winter-love/utils'

export const withPrisma = <ReturnType extends Record<string, unknown>>(
  contextFunction: ContextFunction<ReturnType>,
) => {
  const prisma: PrismaClient = new PrismaClient()
  return async (expressContext: ExpressContext) => {
    return freeze({
      ...(await contextFunction(expressContext)),
      prisma,
    })
  }
}

export type PrismaContext = PrismaClient

export const preparePrisma = () => {
  const prisma: PrismaClient = new PrismaClient()
  return () => prisma
}
