import {validate, createValidate, role} from '../permission'

describe('validate', () => {
  it('should validate any with mixed validator and or logic', () => {
    const logic = ['foo', (value) => value === 'bar']
    expect(validate(logic, 'foo', 'or')).toBe(true)
    expect(validate(logic, 'bar', 'or')).toBe(true)
    expect(validate(logic, 'john', 'or')).toBe(false)
  })
  it('should validate any with mixed validator and and logic', () => {
    const logic = [
      (value: string) => value.includes('foo'),
      (value: string) => value.includes('bar'),
      'foo bar john',
    ]
    expect(validate(logic, 'foo bar john')).toBe(true)
    expect(validate(logic, 'bar')).toBe(false)
    expect(validate(logic, 'foo')).toBe(false)
  })
})

describe('createValidate', () => {
  it('should return validator any with mixed validator and or logic', () => {
    const logic = ['foo', (value) => value === 'bar']
    const validate = createValidate('or', ...logic)
    expect(validate('foo')).toBe(true)
    expect(validate('bar')).toBe(true)
    expect(validate('john')).toBe(false)
  })
})

describe('role', () => {
  it('should return result', async () => {
    const validate = role(['foo', 'bar'])
    expect(validate({roles: ['foo']} as any, {} as any)).toBe(true)
  })
})
