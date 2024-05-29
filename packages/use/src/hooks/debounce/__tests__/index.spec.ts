import {debounce} from '@winter-love/lodash'
import {effectScope} from '@winter-love/test-utils'
import {useDebounce} from '../'
import {beforeEach, describe, expect, it, vi} from 'vitest'
vi.mock('@winter-love/lodash')

describe('debounce', () => {
  beforeEach(() => {
    vi.mocked(debounce).mockClear()
  })
  const setup = () => {
    const fakeCancel = vi.fn()
    const debouncedFunction = vi.fn()
    const callback = vi.fn()
    vi.mocked(debounce).mockImplementationOnce(
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
