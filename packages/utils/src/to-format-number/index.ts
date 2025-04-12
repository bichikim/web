import {toNumber} from 'src/to-number'

export const toFormatNumber = (
  value?: unknown,
  locale: string = 'ko-KR',
  options: Partial<Intl.NumberFormatOptions> = {},
) => {
  const {style = 'decimal', ...rest} = options
  const numberValue = toNumber(value)

  return new Intl.NumberFormat(locale, {...rest, style}).format(numberValue)
}
