import {expect, test} from 'vitest'
import {createEmptyDocument, createPlayer, parseDocument, serializeDocument} from '../../src/player'

test('should restore paused clipped pixels without a resize or new computed frame', async () => {
  const texture = document.createElement('canvas')
  texture.width = 1
  texture.height = 1
  const context = texture.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 1, 1)
  const parsed = parseDocument(
    serializeDocument({
      ...createEmptyDocument(),
      parts: ['mask', 'front'].map((id) => ({
        id,
        mesh: {
          indices: [0, 1, 2, 0, 2, 3],
          uvs: [0, 0, 1, 0, 1, 1, 0, 1],
          vertices: [0, 0, id === 'mask' ? 32 : 64, 0, id === 'mask' ? 32 : 64, 64, 0, 64],
        },
        properties: id === 'mask' ? {renderWhenUsedAsMask: false} : {clippingMaskIds: ['mask']},
        texture: {height: 1, src: texture.toDataURL(), width: 1},
      })),
      scene: {
        roots: ['mask', 'front'].map((id) => ({
          id,
          kind: 'part',
          locked: false,
          name: id,
          visible: true,
        })),
      },
      viewport: {height: 64, width: 64},
    }),
  )
  if (!parsed.ok) {
    throw new Error(`Invalid context restoration fixture: ${JSON.stringify(parsed)}`)
  }
  const canvas = document.createElement('canvas')
  const player = await createPlayer({
    antialiasing: 'ssaa',
    buffering: false,
    canvas,
    document: parsed.document,
    renderer: 'webgl',
    resolution: 1,
  })
  const gl = canvas.getContext('webgl2')!
  try {
    player.pause()
    player.stop()
    player.redraw()
    const copy = () => {
      gl.finish()
      const copy = document.createElement('canvas')
      copy.width = canvas.width
      copy.height = canvas.height
      const target = copy.getContext('2d')!
      target.drawImage(canvas, 0, 0)
      return target.getImageData(0, 0, copy.width, copy.height).data
    }
    const before = copy()
    expect(before.some((value) => value > 0)).toBe(true)
    const extension = gl.getExtension('WEBGL_lose_context')!
    const lost = new Promise<void>((resolve) => {
      canvas.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault()
          resolve()
        },
        {once: true},
      )
    })
    extension.loseContext()
    await lost
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    const restored = new Promise<void>((resolve) => {
      canvas.addEventListener('webglcontextrestored', () => resolve(), {once: true})
    })
    extension.restoreContext()
    await restored
    expect(copy()).toEqual(before)
    expect(gl.getError()).toBe(gl.NO_ERROR)
  } finally {
    player.destroy()
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
})
