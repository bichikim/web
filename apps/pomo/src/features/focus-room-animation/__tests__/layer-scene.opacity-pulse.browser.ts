import 'pixi.js/unsafe-eval'
import {Application, Sprite, Ticker} from 'pixi.js'
import {expect, it, vi} from 'vitest'

import {PixiLayerScene} from '../layer-scene'
import {getPSceneLayer} from '../scene-layer-catalog'
import {createFocusRoomLayerState} from '../scene-layer-state'

const RANDOM_SAMPLE = 0.5
const ALPHA_PRECISION = 10
const LAST_STAR_ALPHA = 0.2459623273767344
const RESET_OPACITIES = [0, 0, 0, 0, 0, LAST_STAR_ALPHA]

it('should keep the original night-reading faint stars unchanged at the first zero tick', async () => {
  const definition = getPSceneLayer('night-reading-focused', 'original')
  const application = new Application()
  await application.init({
    autoStart: false,
    height: definition.height,
    preference: 'webgl',
    resolution: 1,
    width: definition.width,
  })
  document.body.append(application.canvas)
  const add = vi.spyOn(Ticker.prototype, 'add')
  const scene = new PixiLayerScene(definition, {
    onRender: () => application.render(),
    random: () => RANDOM_SAMPLE,
  })
  application.stage.addChild(scene.container)
  try {
    await scene.initialize(createFocusRoomLayerState('rest', true))
    const stars = scene.container.children.flatMap((layer) =>
      layer.children.filter(
        (view): view is Sprite =>
          view instanceof Sprite && view.texture.label?.includes('/faint-stars/') === true,
      ),
    )
    const initial = stars.map((sprite) => sprite.alpha)
    const before = application.renderer.extract.pixels(scene.container)
    scene.setAnimationEnabled(true)
    const [ticker] = add.mock.contexts
    if (!(ticker instanceof Ticker)) {
      throw new Error('Expected the layer scene ticker.')
    }
    ticker.stop()
    ticker.deltaMS = 0
    const [[advance]] = add.mock.calls
    advance(ticker)
    const advanced = stars.map((sprite) => sprite.alpha)
    const after = application.renderer.extract.pixels(scene.container)
    const pixelsMatch =
      before.width === after.width &&
      before.height === after.height &&
      before.pixels.every((value, index) => value === after.pixels[index])
    expect(stars).toHaveLength(RESET_OPACITIES.length)
    expect(initial.slice(0, -1)).toEqual(RESET_OPACITIES.slice(0, -1))
    expect(initial.at(-1)).toBeCloseTo(LAST_STAR_ALPHA, ALPHA_PRECISION)
    for (const [index, alpha] of advanced.entries()) {
      expect(alpha).toBeCloseTo(initial[index], ALPHA_PRECISION)
    }
    expect(pixelsMatch).toBe(true)
  } finally {
    scene.destroy()
    application.destroy(true)
    add.mockRestore()
  }
})
