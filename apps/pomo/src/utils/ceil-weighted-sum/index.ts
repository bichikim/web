export interface DecimalProduct {
  readonly multiplier: number
  readonly quantity: bigint
}

export interface CeilWeightedSumOptions {
  readonly products: ReadonlyArray<DecimalProduct>
}

interface DecimalTerm {
  readonly scale: number
  readonly units: bigint
}

/**
 * Ceils the sum of nonnegative integer quantities multiplied by finite nonnegative
 * numbers interpreted through their canonical decimal string representations.
 * Returns 0n for an empty sum; throws RangeError for negative quantities or invalid multipliers.
 */
export const ceilWeightedSum = (options: CeilWeightedSumOptions): bigint => {
  const terms = options.products.map(({multiplier, quantity}): DecimalTerm => {
    if (quantity < 0n || !Number.isFinite(multiplier) || multiplier < 0) {
      throw new RangeError(
        'Decimal products require nonnegative quantities and finite nonnegative multipliers',
      )
    }

    const [coefficient = '0', exponent = '0'] = multiplier.toString().split('e')
    const fractionLength = coefficient.split('.')[1]?.length ?? 0
    const scale = fractionLength - Number(exponent)
    const units = quantity * BigInt(coefficient.replace('.', ''))
    return scale < 0 ? {scale: 0, units: units * 10n ** BigInt(-scale)} : {scale, units}
  })
  const scale = terms.reduce((maximum, term) => Math.max(maximum, term.scale), 0)
  const divisor = 10n ** BigInt(scale)
  const total = terms.reduce(
    (sum, term) => sum + term.units * 10n ** BigInt(scale - term.scale),
    0n,
  )
  return (total + divisor - 1n) / divisor
}
