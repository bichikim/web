import {getWindow} from '@winter-love/utils'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {getRegistrations, skipWaiting} from '../get-registrations'

vi.mock('@winter-love/utils', () => ({
  getWindow: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('getRegistrations', () => {
  it('should return an empty list outside the browser', () => {
    vi.mocked(getWindow).mockReturnValue(null)

    return expect(getRegistrations()).resolves.toEqual([])
  })

  it('should use the multi-registration browser API when available', () => {
    const registrations = [{} as ServiceWorkerRegistration]
    const getRegistrationList = vi.fn().mockResolvedValue(registrations)
    vi.mocked(getWindow).mockReturnValue({
      navigator: {serviceWorker: {getRegistrations: getRegistrationList}},
    } as unknown as Window)

    return expect(getRegistrations()).resolves.toBe(registrations)
  })

  it('should fall back to the ready registration for older browsers', () => {
    const registration = {} as ServiceWorkerRegistration
    const serviceWorker = {ready: Promise.resolve(registration)}
    const windowValue = {navigator: {serviceWorker}} as unknown as Window
    vi.mocked(getWindow).mockReturnValue(windowValue)
    vi.stubGlobal('navigator', windowValue.navigator)

    return expect(getRegistrations()).resolves.toEqual([registration])
  })
})

describe('skipWaiting', () => {
  it('should notify a waiting worker', async () => {
    const postMessage = vi.fn()
    const registration = {waiting: {postMessage}} as unknown as ServiceWorkerRegistration

    await skipWaiting(registration)

    expect(postMessage).toHaveBeenCalledWith({type: 'SKIP_WAITING'})
  })

  it('should do nothing without a registration or waiting worker', async () => {
    expect(await skipWaiting()).toBeUndefined()
    expect(await skipWaiting({} as ServiceWorkerRegistration)).toBeUndefined()
  })
})
