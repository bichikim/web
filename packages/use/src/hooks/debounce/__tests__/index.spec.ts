import {debounce} from '@winter-love/lodash'
import {effectScope} from '@winter-love/vue-test'
import {useDebounce} from '../'

jest.mock('@winter-love/lodash')

describe('debounce', () => {
  beforeEach(() => {
    jest.mocked(debounce).mockClear()
  })
  const setup = () => {
    const fakeCancel = jest.fn()
    const debouncedFunction = jest.fn()
    const callback = jest.fn()
    jest
      .mocked(debounce)
      .mockImplementationOnce(
        () => Object.assign(debouncedFunction, {cancel: fakeCancel}) as any,
      )

    return {
      callback,
      cancel: fakeCancel,
      debouncedFunction,
    }
  }
  it('should cancel debounced function', () => {
    const prepare = setup()

    const scope = effectScope()
    scope.run(() => {
      return useDebounce(1, prepare.callback)
    })

    expect(prepare.cancel).toBeCalledTimes(0)

    scope.stop()

    expect(prepare.cancel).toBeCalledTimes(1)
  })
  it('should call debounced function', () => {
    const prepare = setup()

    const scope = effectScope()
    const call = scope.run(() => {
      return useDebounce(1, prepare.callback)
    })

    expect(prepare.debouncedFunction).toBeCalledTimes(0)

    call?.()

    expect(prepare.debouncedFunction).toBeCalledTimes(1)
  })
  it('should pass options', async () => {
    const prepare = setup()

    const scope = effectScope()
    const call = scope.run(() => {
      return useDebounce(1, prepare.callback)
    })

    expect(debounce).toBeCalledTimes(1)

    call?.()
    expect(prepare.debouncedFunction).toBeCalledTimes(1)
  })
})
