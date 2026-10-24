import {calculateInvoiceTotal} from '../invoice-total'

it('calculates the total from invoice line amounts', () => {
  const actual = calculateInvoiceTotal([1_000, 2_500, 500])
  const expected = 4_000

  expect(actual).toBe(expected)
})
