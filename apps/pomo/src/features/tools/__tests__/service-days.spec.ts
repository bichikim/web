import {expect, it} from 'vitest'
import {isValidServiceDays, normalizeServiceDays, parseServiceDays} from 'src/features/tools'

it.each([
  {input: '1', output: 1},
  {input: '0001', output: 1},
  {input: '300', output: 300},
  {input: '9007199254740991', output: Number.MAX_SAFE_INTEGER},
])('should parse valid service days from $input', ({input, output}) => {
  expect(parseServiceDays(input)).toBe(output)
})

it.each(['', '0', '-1', '1.5', 'not-a-number', '9007199254740992'])(
  'should reject invalid service days %s',
  (input) => {
    expect(parseServiceDays(input)).toBeNull()
  },
)

it.each([
  {input: '', output: ''},
  {input: '000300', output: '000300'},
  {input: '0', output: ''},
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
