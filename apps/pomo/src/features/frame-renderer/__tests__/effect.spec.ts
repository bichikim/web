/** @vitest-environment jsdom */
import {GlProgram, Texture, TextureSource} from 'pixi.js'
import {afterEach, expect, it, vi} from 'vitest'
import {ScreenEffect} from '../effect'
afterEach(() => vi.restoreAllMocks())
it('should bind borrowed textures and update transition uniforms without destroying sources', () => {
  vi.spyOn(GlProgram, 'from').mockReturnValue({destroy: vi.fn()} as unknown as GlProgram)
  const from = new Texture({source: new TextureSource({height: 200, width: 400})})
  const to = new Texture({source: new TextureSource({height: 600, width: 300})})
  const effect = new ScreenEffect({effect: 'rgb-kinetic', from, to})
  const uniforms = effect.resources.transitionUniforms.uniforms
  expect(uniforms.uEffect).toBe(3)
  expect(uniforms.uRatio).toBe(0.5)
  expect(effect.resources.uFrom).toBe(from.source)
  effect.setProgress(0.5)
  expect(uniforms.uProgress).toBe(0.5)
  effect.destroy()
  expect(from.destroyed).toBe(false)
  expect(to.destroyed).toBe(false)
  from.destroy(true)
  to.destroy(true)
})
