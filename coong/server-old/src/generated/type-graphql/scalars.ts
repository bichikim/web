import {Prisma} from '@prisma/client'
import {GraphQLScalarType} from 'graphql'

export const DecimalJSScalar = new GraphQLScalarType({
  description: 'GraphQL Scalar representing the Prisma.Decimal type, based on Decimal.js library.',
  name: 'Decimal',
  parseValue: (value: unknown) => {
    if (!(typeof value === 'string')) {
      throw new TypeError(`[DecimalError] Invalid argument: ${typeof value}. Expected string.`)
    }
    return new Prisma.Decimal(value)
  },
  serialize: (value: unknown) => {
    if (!Prisma.Decimal.isDecimal(value)) {
      throw new Error(
        `[DecimalError] Invalid argument: ${Object.prototype.toString.call(
          value,
        )}. Expected Prisma.Decimal.`,
      )
    }
    return (value as Prisma.Decimal).toString()
  },
})
