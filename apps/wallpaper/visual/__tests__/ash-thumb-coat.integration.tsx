// oxlint-disable no-await-in-loop -- One player verifies both wardrobe transitions.
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {
  createPlayer,
  flushPlayerInputs,
  type Player,
  preparePuppetDocument,
} from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import {
  getPartRenderFrame,
  type PartRenderFrame,
} from '../../../../packages/puppet/src/player/internal/render-plan'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

vi.mock(
  '../../../../packages/puppet/src/player/rendering/create-player-renderer',
  async (original) => {
    const actual = await original<typeof rendererModule>()
    return {...actual, createPlayerRenderer: vi.fn(actual.createPlayerRenderer)}
  },
)

let player: Player | undefined
afterEach(() => {
  player?.destroy()
  player = undefined
  cleanup()
  vi.clearAllMocks()
})

test.each([false, true])(
  'should use the original thumb hand inside the sleeve and the repaired hand without it (buffering=%s)',
  async (buffering) => {
    const loaded = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!loaded.ok) {
      throw new Error('Invalid Ash model')
    }
    const model = loaded.document
    const expression = model.expressions!.find((expression) => expression.id === '엄지 척')!
    const defaults = Object.fromEntries(
      model.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
    )
    const pose = Object.fromEntries(
      expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
    )
    let canvas!: HTMLCanvasElement
    render(() => (
      <section aria-label="Thumb wrist wardrobe" class="h-137.5 w-112.5 bg-white">
        <canvas ref={canvas} class="h-full w-full" />
      </section>
    ))
    player = await createPlayer({
      buffering,
      canvas,
      document: model,
      framing: 'viewport',
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 1.5,
    })
    const current = player
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    current.setViewCamera({x: 1800, y: 1050, zoom: 0.85})
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    let rendered: PartRenderFrame | undefined
    const apply = renderer.applyPreparedFrame.bind(renderer)
    vi.spyOn(renderer, 'applyPreparedFrame').mockImplementation((prepared) => {
      rendered = prepared.frame
      apply(prepared)
    })
    for (const coat of [0, 1, 0]) {
      const values = {...defaults, ...pose, Param49: coat}
      current.patchParameterBlends(
        Object.fromEntries(
          Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
        ),
        'after-physics',
      )
      await flushPlayerInputs(current)
      const frame = buffering ? rendered! : getPartRenderFrame(model, values)
      const opacity = (id: string) => {
        const part = frame.plans.find((part) => part.partId === id)!
        return part.visible && part.render
          ? part.properties.opacity *
              part.layerIds.reduce(
                (opacity, layer) => opacity * frame.layers.get(layer)!.properties.opacity,
                1,
              )
          : 0
      }
      expect(opacity('thumb:hand'), `Extended bare wrist: wardrobe ${coat}`).toBe(coat)
      expect(opacity('ArtMesh902'), `Original cuff hand: wardrobe ${coat}`).toBe(1 - coat)
      expect(opacity('ArtMesh903'), `Original thumb fingers: wardrobe ${coat}`).toBe(1 - coat)
      expect(opacity('coat-free:thumb-left:ArtMesh901'), 'Obsolete bare wrist cap').toBe(0)
      await page.getByRole('region', {name: 'Thumb wrist wardrobe'}).screenshot({
        path: `__screenshots__/ash-thumb-coat-${buffering}-${coat}.png`,
      })
    }
  },
  30_000,
)
