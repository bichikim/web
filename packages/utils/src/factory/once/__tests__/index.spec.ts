import {once} from '../'

describe('create once', () => {
  it('should once that run once', () => {
    const runner = jest.fn()
    const _once = once(runner)
    _once()

    expect(runner).toHaveBeenCalledTimes(1)

    _once()

    expect(runner).toHaveBeenCalledTimes(1)
  })
})
