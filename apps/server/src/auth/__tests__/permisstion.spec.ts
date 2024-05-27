import {and, role} from '../permission'

describe('and', () => {
  it('should compare both values with and logic all true', () => {
    const run = and(
      (value: boolean) => value,
      (value: boolean) => value,
    )

    expect(run(true)).toBeTruthy()
  })
  it('should compare both values with and logic all true', () => {
    const run = and(
      (value: boolean) => value,
      (value: boolean) => !value,
    )

    expect(run(true)).toBeFalsy()
  })
  it('should compare both values with and logic all true', () => {
    const run = and(
      (value: boolean) => !value,
      (value: boolean) => value,
    )

    expect(run(true)).toBeFalsy()
  })
})

describe('role', () => {
  it('should return result', async () => {
    const validate = role(['foo', 'bar'])
    expect(await validate({roles: ['foo']} as any, {} as any)).toBe(true)
  })
})
