import {toNumber} from '../to-number'

export const toFormattedNumber = (
  value?: any,
  locale: string = 'ko-KR',
  options: Partial<Intl.NumberFormatOptions> = {},
) => {
  const {style = 'decimal', ...rest} = options
  const numberValue = toNumber(value)
  return new Intl.NumberFormat(locale, {...rest, style}).format(numberValue)
}
