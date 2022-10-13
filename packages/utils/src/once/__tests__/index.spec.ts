import {createOnce} from '../'

describe('create once', () => {
  it('should once that run once', () => {
    const runner = jest.fn()
    const once = createOnce(runner)
    once()

    expect(runner).toHaveBeenCalledTimes(1)

    once()

    expect(runner).toHaveBeenCalledTimes(1)
  })
})
