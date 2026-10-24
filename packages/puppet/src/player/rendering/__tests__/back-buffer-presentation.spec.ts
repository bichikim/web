import {GlBackBufferSystem, State, type WebGLRenderer} from 'pixi.js'
import {describe, expect, test} from 'vitest'
import {replaceBackBufferPresentation} from '../back-buffer-presentation'

const createBackBuffer = (useBackBuffer: boolean) => {
  const backBuffer = new GlBackBufferSystem({
    context: {supports: {msaa: true}},
  } as unknown as WebGLRenderer)
  backBuffer.init({useBackBuffer})
  return backBuffer
}

describe('replaceBackBufferPresentation', () => {
  // Fails when an installed PixiJS release moves the private presentation state.
  test('should present the installed PixiJS back buffer without blending', () => {
    const backBuffer = createBackBuffer(true)
    expect(replaceBackBufferPresentation(backBuffer)).toBe('replaced')
    expect((backBuffer as unknown as {_state: State})._state).toMatchObject({blendMode: 'none'})
  })
  test('should leave a back buffer that is not used unchanged', () => {
    const backBuffer = createBackBuffer(false)
    expect(replaceBackBufferPresentation(backBuffer)).toBe('unused')
    expect((backBuffer as unknown as {_state: State})._state).toMatchObject({blendMode: 'normal'})
    expect(replaceBackBufferPresentation(undefined)).toBe('unused')
  })
  test('should keep the default presentation without the private state', () => {
    const backBuffer = {_state: {blendMode: 'normal'}, useBackBuffer: true}
    expect(replaceBackBufferPresentation(backBuffer)).toBe('unsupported')
    expect(backBuffer._state.blendMode).toBe('normal')
  })
})
