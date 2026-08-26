import {Assets} from 'pixi.js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {acquireTexture, acquireTextureGroup, releaseTextureGroup} from '../texture-leases'

vi.mock('pixi.js', () => ({
  Assets: {
    load: vi.fn(),
    unload: vi.fn(),
  },
}))

const createTexture = (source: string) => ({source}) as never

afterEach(() => {
  vi.clearAllMocks()
})

describe('acquireTexture', () => {
  it('should retain a shared texture until its final consumer releases it', async () => {
    vi.mocked(Assets.load).mockImplementation(async (source) => createTexture(String(source)))
    vi.mocked(Assets.unload).mockResolvedValue(undefined)

    const firstLease = await acquireTexture('shared-scene.png')
    const secondLease = await acquireTexture('shared-scene.png')

    expect(Assets.load).toHaveBeenCalledTimes(1)
    expect(firstLease.texture).toBe(secondLease.texture)

    firstLease.release()
    expect(Assets.unload).not.toHaveBeenCalled()

    secondLease.release()
    expect(Assets.unload).toHaveBeenCalledWith('shared-scene.png')
  })

  it('should ignore a duplicate release from the same lease', async () => {
    vi.mocked(Assets.load).mockResolvedValue(createTexture('single-scene.png'))
    vi.mocked(Assets.unload).mockResolvedValue(undefined)
    const lease = await acquireTexture('single-scene.png')

    lease.release()
    lease.release()

    expect(Assets.unload).toHaveBeenCalledTimes(1)
  })

  it('should wait for an active unload before acquiring a new entry', async () => {
    let resolveUnload: () => void = () => undefined
    vi.mocked(Assets.load).mockImplementation(async (source) => createTexture(String(source)))
    vi.mocked(Assets.unload)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUnload = resolve
          }),
      )
      .mockResolvedValue(undefined)
    const firstLease = await acquireTexture('reloaded-scene.png')
    firstLease.release()

    const nextAcquisition = acquireTexture('reloaded-scene.png')
    await Promise.resolve()
    expect(Assets.load).toHaveBeenCalledTimes(1)

    resolveUnload()
    const nextLease = await nextAcquisition
    expect(Assets.load).toHaveBeenCalledTimes(2)
    expect(nextLease.texture).not.toBe(firstLease.texture)
    nextLease.release()
  })

  it('should report an unload failure and still allow a later acquisition', async () => {
    const unloadError = new Error('cache unload failed')
    const reportError = vi.fn()
    vi.stubGlobal('reportError', reportError)
    vi.mocked(Assets.load).mockImplementation(async (source) => createTexture(String(source)))
    vi.mocked(Assets.unload).mockRejectedValueOnce(unloadError).mockResolvedValue(undefined)
    const firstLease = await acquireTexture('failed-unload.png')
    firstLease.release()

    await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(unloadError))
    const nextLease = await acquireTexture('failed-unload.png')

    expect(Assets.load).toHaveBeenCalledTimes(2)
    nextLease.release()
    vi.unstubAllGlobals()
  })

  it('should remove a failed load entry before retrying the source', async () => {
    const loadError = new Error('texture unavailable')
    vi.mocked(Assets.load)
      .mockRejectedValueOnce(loadError)
      .mockResolvedValueOnce(createTexture('retried-scene.png'))
    vi.mocked(Assets.unload).mockResolvedValue(undefined)

    await expect(acquireTexture('retried-scene.png')).rejects.toBe(loadError)
    const lease = await acquireTexture('retried-scene.png')

    expect(Assets.load).toHaveBeenCalledTimes(2)
    lease.release()
  })
})

describe('acquireTextureGroup', () => {
  it('should release successful partial loads when another texture fails', async () => {
    const loadError = new Error('depth failed')
    vi.mocked(Assets.load).mockImplementation(async (source) => {
      if (String(source) === 'depth.png') {
        throw loadError
      }

      return createTexture(String(source))
    })
    vi.mocked(Assets.unload).mockResolvedValue(undefined)

    await expect(acquireTextureGroup(['scene.png', 'depth.png'])).rejects.toBe(loadError)
    expect(Assets.unload).toHaveBeenCalledWith('scene.png')
  })

  it('should return every successful lease and release the group together', async () => {
    vi.mocked(Assets.load).mockImplementation(async (source) => createTexture(String(source)))
    vi.mocked(Assets.unload).mockResolvedValue(undefined)

    const leases = await acquireTextureGroup(['group-scene.png', 'group-depth.png'])
    expect(leases.map((lease) => lease.source)).toEqual(['group-scene.png', 'group-depth.png'])

    releaseTextureGroup(leases)

    expect(Assets.unload).toHaveBeenCalledWith('group-scene.png')
    expect(Assets.unload).toHaveBeenCalledWith('group-depth.png')
  })
})
