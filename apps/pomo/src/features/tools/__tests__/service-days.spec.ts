import {expect, it} from 'vitest'
import {isValidServiceDays, normalizeServiceDays, parseServiceDays} from 'src/features/tools'

it.each([
  {input: '1', output: 1},
  {input: '0001', output: 1},
  {input: '３６５', output: 365},
  {input: '０００１', output: 1},
  {input: '300', output: 300},
  {input: ' 300 ', output: 300},
  {input: '\t３００\r\n', output: 300},
  {input: '1,000', output: 1000},
  {input: '５，０００', output: 5000},
  {input: ' 300,000 ', output: 300000},
  {input: '３００，０００', output: 300000},
  {input: '9,007,199,254,740,991', output: Number.MAX_SAFE_INTEGER},
  {input: '9007199254740991', output: Number.MAX_SAFE_INTEGER},
  {input: '９００７１９９２５４７４０９９１', output: Number.MAX_SAFE_INTEGER},
])('should parse valid service days from $input', ({input, output}) => {
  expect(parseServiceDays(input)).toBe(output)
})

it.each([
  '',
  '0',
  '０',
  '-1',
  '1.5',
  '１．５',
  '＋１',
  ' 3 00 ',
  ',100',
  '100,',
  '1,00',
  '12,34',
  '1234,000',
  '1,,000',
  '1,000,00',
  '1, 000',
  '１，００',
  '0,000',
  '1,000.5',
  '1,000e0',
  '9,007,199,254,740,992',
  '+1',
  '－１',
  '−1',
  '–1',
  '‒1',
  '﹣1',
  'not-a-number',
  '9007199254740992',
  '９００７１９９２５４７４０９９２',
])('should reject invalid service days %s', (input) => {
  expect(parseServiceDays(input)).toBeNull()
})

it.each([
  {input: '', output: ''},
  {input: '000300', output: '000300'},
  {input: '０００３００', output: '０００３００'},
  {input: ' 300 ', output: '300'},
  {input: '\t３００\r\n', output: '３００'},
  {input: ' 1,000 ', output: '1,000'},
  {input: '\t５，０００\r\n', output: '５，０００'},
  {input: '1,00', output: ''},
  {input: ' \t\r\n', output: ''},
  {input: '0', output: ''},
  {input: ' 3 00 ', output: ''},
  {input: 'not-a-number', output: ''},
])('should normalize service days $input to $output', ({input, output}) => {
  expect(normalizeServiceDays(input)).toBe(output)
})

it.each([1, 300, Number.MAX_SAFE_INTEGER])(
  'should accept positive safe integer days %s',
  (value) => {
    expect(isValidServiceDays(value)).toBe(true)
  },
)

it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  'should reject non-positive or unsafe service days %s',
  (value) => {
    expect(isValidServiceDays(value)).toBe(false)
  },
)
