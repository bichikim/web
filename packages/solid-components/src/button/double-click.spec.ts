import {describe, expect, it, vi} from 'vitest'
import {useDoubleClick} from './double-click'

const event = new MouseEvent('click')

describe('useDoubleClick', () => {
  it('restores loading after a rejected handler', async () => {
    const onLoading = vi.fn()
    const error = new Error('failed')
    const handlers = useDoubleClick(() => ({
      active: true,
      onClick: () => Promise.reject(error),
      onLoading,
    }))

    await expect(handlers.handleClick(event)).rejects.toBe(error)
    expect(onLoading.mock.calls).toEqual([[true], [false]])
  })

  it('keeps loading active until all overlapping handlers finish', async () => {
    const onLoading = vi.fn()
    const resolvers: Array<() => void> = []
    const handlers = useDoubleClick(() => ({
      active: true,
      onClick: () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve)
        }),
      onLoading,
    }))

    const first = handlers.handleClick(event)
    const second = handlers.handleClick(event)
    resolvers[0]()
    await first

    expect(onLoading).not.toHaveBeenCalledWith(false)

    resolvers[1]()
    await second
    expect(onLoading.mock.calls).toEqual([[true], [true], [false]])
  })
})
