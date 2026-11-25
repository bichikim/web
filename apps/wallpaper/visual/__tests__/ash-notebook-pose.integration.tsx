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
import reference from '../fixtures/ash-notebook-pose.json'
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
  vi.clearAllMocks()
  cleanup()
})

test.each([false, true])(
  'should keep the smaller notebook in front of the pen while preserving the arm pose (buffering=%s)',
  async (buffering) => {
    const prepared = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!prepared.ok) {
      throw Error('Invalid Ash')
    }
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-150 w-100 bg-white">
        <canvas ref={canvas} aria-label="Notebook and pen arm pose" class="h-full w-full" />
      </div>
    ))
    player = await createPlayer({
      buffering,
      canvas,
      document: prepared.document,
      framing: 'viewport',
      onAfterRender: () => undefined,
      physicsPreview: false,
      renderer: 'pixi-webgl',
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    current.setViewCamera({x: 1900, y: 1050, zoom: 0.35})
    current.setParameterValues(reference.values)
    await flushPlayerInputs(current)
    const angle = (reference.angleDegrees * Math.PI) / 180
    const elbow = reference.parts['coat-free:notes-left:ArtMesh900'].slice(-2)
    for (const [id, before] of Object.entries(reference.parts)) {
      const actual = renderer.getPartVertices(id)!
      expect(actual.length, id).toBe(before.length)
      const grip = [0, 1].map((axis) => before[axis]! + (before[axis + 2]! - before[axis]!) * 0.55)
      const errors = Array.from({length: before.length / 2 - 1}, (_, index) => {
        const x = before[index * 2]!
        const y = before[index * 2 + 1]!
        const expected =
          id === 'ArtMesh128'
            ? [
                grip[0]! + (x - grip[0]!) * reference.scale,
                grip[1]! + (y - grip[1]!) * reference.scale,
              ]
            : [
                elbow[0]! + (x - elbow[0]!) * Math.cos(angle) - (y - elbow[1]!) * Math.sin(angle),
                elbow[1]! + (x - elbow[0]!) * Math.sin(angle) + (y - elbow[1]!) * Math.cos(angle),
              ]
        return Math.hypot(actual[index * 2]! - expected[0]!, actual[index * 2 + 1]! - expected[1]!)
      })
      expect(Math.max(...errors), `${id} preserves its rigid shape and attachment`).toBeLessThan(
        0.01,
      )
    }
    const actual = renderer.getPartVertices('coat-free:notes-left:ArtMesh900')!
    expect(
      Math.hypot(actual[actual.length - 2]! - elbow[0]!, actual[actual.length - 1]! - elbow[1]!),
      'The elbow stays attached at its original position',
    ).toBeLessThan(0.01)
    for (const writing of [0, 0.5, 1]) {
      current.patchParameterValues({Param93: writing})
      // oxlint-disable-next-line no-await-in-loop -- Inspect each displayed writing pose in order.
      await flushPlayerInputs(current)
      const order = renderer.getPaintOrder()
      const notebook = order.indexOf('ArtMesh128')
      expect(order.indexOf('ArtMesh139')).toBeGreaterThanOrEqual(0)
      expect(order.indexOf('ArtMesh139'), 'The pen stays behind the notebook').toBeLessThan(
        notebook,
      )
      expect(notebook).toBeGreaterThanOrEqual(0)
      expect(notebook, 'The gripping hand stays in front of the notebook').toBeLessThan(
        order.indexOf('ArtMesh125'),
      )
      expect(notebook, 'The supporting forearm stays in front of the notebook').toBeLessThan(
        order.indexOf('coat-free:notes-right:ArtMesh994'),
      )
      if (writing === 0 && !buffering) {
        // oxlint-disable-next-line no-await-in-loop -- Capture the displayed pose before advancing it.
        await page
          .getByLabelText('Notebook and pen arm pose')
          .screenshot({path: '__screenshots__/ash-notebook-layer.png'})
      }
    }
  },
  30_000,
)
