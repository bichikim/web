/** @vitest-environment jsdom */
import {createNativePlayer, type NativePlayerSurface} from '@winter-love/puppet/native'
import {
  createEmptyDocument,
  flushPlayerInputs,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import {expect, test, vi} from 'vitest'

test.each(['metal', 'dx12'] as const)(
  'should present and close the %s surface using a document prepared by the web entry point',
  async (kind) => {
    const prepared = await preparePuppetDocument({document: createEmptyDocument()})
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      throw new Error('Test document could not be prepared')
    }
    const surface: NativePlayerSurface = {
      close: vi.fn(),
      playback: vi.fn(),
      present: vi.fn(async () => new Uint8Array(0)),
      readAlpha: vi.fn(),
      release: vi.fn(),
    }
    const open = vi.fn(async () => surface)
    const player = await createNativePlayer({
      canvas: document.createElement('canvas'),
      document: prepared.document,
      nativeBackend: {kind, open},
    })
    try {
      player.redraw()
      await expect(flushPlayerInputs(player)).resolves.toBe('applied')
      expect(player.getRenderingInfo().nativeSurface).toBe(kind)
      expect(open).toHaveBeenCalledOnce()
      expect(surface.present).toHaveBeenCalled()
    } finally {
      player.destroy()
    }
    expect(surface.close).toHaveBeenCalledOnce()
  },
)
