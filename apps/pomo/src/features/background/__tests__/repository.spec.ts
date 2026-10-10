/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {BackgroundRepository} from '../model'
import {createNativeRepository} from '../native-repository'
import {createWebRepository} from '../web-repository'

vi.mock('../native-repository', () => ({createNativeRepository: vi.fn()}))
vi.mock('../web-repository', () => ({createWebRepository: vi.fn()}))

const repository: BackgroundRepository = {
  add: vi.fn(),
  configure: vi.fn(),
  load: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
  subscribe: vi.fn(),
}

let getRepository: typeof import('../repository').getBackgroundRepository

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'false')
  getRepository = (await import('../repository')).getBackgroundRepository
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('background repository loading', () => {
  it('should open the web repository on demand and share its pending and completed Promise', async () => {
    vi.mocked(createWebRepository).mockReturnValue(repository)
    expect(createWebRepository).not.toHaveBeenCalled()
    expect(createNativeRepository).not.toHaveBeenCalled()

    const first = getRepository()
    expect(getRepository()).toBe(first)
    await expect(first).resolves.toBe(repository)
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
    expect(getRepository()).toBe(first)
    expect(createWebRepository).toHaveBeenCalledOnce()
    expect(createNativeRepository).not.toHaveBeenCalled()
  })

  it('should select the native repository at the first call', async () => {
    vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
    vi.mocked(createNativeRepository).mockReturnValue(repository)

    const first = getRepository()
    expect(getRepository()).toBe(first)
    await expect(first).resolves.toBe(repository)
    expect(createNativeRepository).toHaveBeenCalledOnce()
    expect(createWebRepository).not.toHaveBeenCalled()
  })

  it('should retain the same failed Promise and rejection without reopening storage', async () => {
    const failure = new Error('Unable to open storage.')
    vi.mocked(createWebRepository).mockImplementation(() => {
      throw failure
    })

    const first = getRepository()
    await expect(first).rejects.toBe(failure)
    vi.mocked(createWebRepository).mockReturnValue(repository)
    const second = getRepository()

    expect(second).toBe(first)
    await expect(second).rejects.toBe(failure)
    expect(createWebRepository).toHaveBeenCalledOnce()
  })
})
