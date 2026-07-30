export const parseCssLengthLocal = (length: string) => {
  // oxlint-disable-next-line eslint-js/require-unicode-regexp
  const match = length.match(/^(?<value>[+-]?\d*\.?\d+)(?<unit>[a-z%]*)$/)

  if (!match?.groups) {
    return undefined
  }

  return {
    unit: match.groups.unit,
    value: Number(match.groups.value),
  }
}

export const parseCssLength = (length: string) => {
  if (typeof CSSNumericValue === 'undefined') {
    return parseCssLengthLocal(length)
  }

  try {
    const parsed = CSSNumericValue.parse(length)

    if (!(parsed instanceof CSSUnitValue)) {
      return undefined
    }

    return {
      unit: parsed.unit,
      value: parsed.value,
    }
  } catch {
    return undefined
  }
}
