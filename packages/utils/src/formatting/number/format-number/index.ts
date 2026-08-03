import {toNumber} from 'src/formatting/number/to-number'

export const formatNumber = (
  value?: unknown,
  locale: string = 'ko-KR',
  options: Partial<Intl.NumberFormatOptions> = {},
) => {
  const {style = 'decimal', ...rest} = options
  const numberValue = toNumber(value)

  return new Intl.NumberFormat(locale, {...rest, style}).format(numberValue)
}

/** @deprecated Use `formatNumber` instead. */
export const toFormatNumber = formatNumber
