import {Assets} from 'pixi.js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {acquireTexture, acquireTextureGroup} from '../texture-leases'

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
})
