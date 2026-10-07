/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {useImageSupport} from '../use-support'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should probe once after mount and publish support before notifying', async () => {
  const pending = Promise.withResolvers<{readonly features: ReadonlySet<string>} | null>()
  const requestAdapter = vi.fn(() => pending.promise)
  vi.stubGlobal('navigator', {gpu: {requestAdapter}})
  const onStatus = vi.fn(() => expect(supported()).toBe(true))
  const [revision, setRevision] = createSignal(0)
  let supported!: () => boolean
  const dispose = createRoot((dispose) => {
    supported = useImageSupport({
      get onStatus() {
        revision()
        return onStatus
      },
    })
    expect(supported()).toBe(false)
    expect(requestAdapter).not.toHaveBeenCalled()
    return dispose
  })

  expect(requestAdapter).toHaveBeenCalledOnce()
  pending.resolve({features: new Set(['shader-f16'])})
  await pending.promise
  await Promise.resolve()
  setRevision(1)

  expect(supported()).toBe(true)
  expect(onStatus).toHaveBeenCalledExactlyOnceWith(m.picture_diary_generation_ready())
  expect(requestAdapter).toHaveBeenCalledOnce()
  dispose()
})

it.each(['missing-gpu', 'null-adapter', 'missing-feature'] as const)(
  'should report unsupported for %s',
  async (scenario) => {
    const adapter = scenario === 'null-adapter' ? null : {features: new Set()}
    const requestAdapter = vi.fn().mockResolvedValue(adapter)
    vi.stubGlobal('navigator', scenario === 'missing-gpu' ? {} : {gpu: {requestAdapter}})
    const onStatus = vi.fn()
    let supported!: () => boolean
    const dispose = createRoot((dispose) => {
      supported = useImageSupport({onStatus})
      return dispose
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(supported()).toBe(false)
    expect(onStatus).toHaveBeenCalledExactlyOnceWith(m.picture_diary_generation_unsupported())
    dispose()
  },
)

it.each(['throw', 'reject', 'feature-read'] as const)(
  'should report a %s probe failure without claiming support',
  async (scenario) => {
    const requestAdapter = vi.fn()
    const failure = new Error('probe failed')
    if (scenario === 'throw') {
      requestAdapter.mockImplementation(() => {
        throw failure
      })
    } else if (scenario === 'reject') {
      requestAdapter.mockRejectedValue(failure)
    } else {
      requestAdapter.mockResolvedValue({
        get features() {
          throw failure
        },
      })
    }
    vi.stubGlobal('navigator', {gpu: {requestAdapter}})
    const onStatus = vi.fn()
    let supported!: () => boolean
    const dispose = createRoot((dispose) => {
      supported = useImageSupport({onStatus})
      return dispose
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(supported()).toBe(false)
    expect(onStatus).toHaveBeenCalledExactlyOnceWith(m.picture_diary_generation_support_error())
    dispose()
  },
)

it.each(['resolve', 'reject'] as const)(
  'should ignore a late %s after disposal',
  async (outcome) => {
    const pending = Promise.withResolvers<{readonly features: ReadonlySet<string>} | null>()
    vi.stubGlobal('navigator', {gpu: {requestAdapter: vi.fn(() => pending.promise)}})
    const onStatus = vi.fn()
    let supported!: () => boolean
    const dispose = createRoot((dispose) => {
      supported = useImageSupport({onStatus})
      return dispose
    })
    dispose()

    if (outcome === 'resolve') {
      pending.resolve({features: new Set(['shader-f16'])})
    } else {
      pending.reject(new Error('late probe failure'))
    }
    await pending.promise.catch(() => undefined)
    await Promise.resolve()

    expect(supported()).toBe(false)
    expect(onStatus).not.toHaveBeenCalled()
  },
)

it('should report a notification failure while retaining the computed support', async () => {
  vi.stubGlobal('navigator', {
    gpu: {requestAdapter: vi.fn().mockResolvedValue({features: new Set(['shader-f16'])})},
  })
  const onStatus = vi.fn().mockImplementationOnce(() => {
    throw new Error('notification failed')
  })
  let supported!: () => boolean
  const dispose = createRoot((dispose) => {
    supported = useImageSupport({onStatus})
    return dispose
  })
  await Promise.resolve()
  await Promise.resolve()

  expect(supported()).toBe(true)
  expect(onStatus.mock.calls).toEqual([
    [m.picture_diary_generation_ready()],
    [m.picture_diary_generation_support_error()],
  ])
  dispose()
})
