/** @vitest-environment node */
import {expect, it} from 'vitest'
import {formatFileSize} from '../format-file-size'

it.each([
  {bytes: 0, label: 'zero bytes', quantity: 0, unit: 'byte'},
  {bytes: 1.25, label: 'fractional bytes', quantity: 1.25, unit: 'byte'},
  {bytes: 999, label: 'the last byte before a kilobyte', quantity: 999, unit: 'byte'},
  {bytes: 1000, label: 'the decimal kilobyte boundary', quantity: 1, unit: 'kilobyte'},
  {bytes: 1250, label: 'fractional kilobytes', quantity: 1.25, unit: 'kilobyte'},
  {
    bytes: 999999,
    label: 'rounding below the megabyte boundary',
    quantity: 999.999,
    unit: 'kilobyte',
  },
  {bytes: 1000000, label: 'the decimal megabyte boundary', quantity: 1, unit: 'megabyte'},
  {bytes: 1000000000, label: 'megabytes above a gigabyte', quantity: 1000, unit: 'megabyte'},
  {bytes: -1, label: 'negative bytes', quantity: -1, unit: 'byte'},
  {bytes: Number.NaN, label: 'NaN', quantity: Number.NaN, unit: 'megabyte'},
  {
    bytes: Number.POSITIVE_INFINITY,
    label: 'positive infinity',
    quantity: Number.POSITIVE_INFINITY,
    unit: 'megabyte',
  },
  {
    bytes: Number.NEGATIVE_INFINITY,
    label: 'negative infinity',
    quantity: Number.NEGATIVE_INFINITY,
    unit: 'byte',
  },
])(
  'should preserve $label with native default-locale unit formatting',
  ({bytes, quantity, unit}) => {
    const expected = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
      style: 'unit',
      unit,
    }).format(quantity)

    expect(formatFileSize(bytes)).toBe(expected)
  },
)
