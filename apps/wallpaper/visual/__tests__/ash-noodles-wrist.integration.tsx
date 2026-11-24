// oxlint-disable no-await-in-loop -- A single player exercises wardrobe and wrist movement together.
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
import {getPartRenderFrame} from '../../../../packages/puppet/src/player/internal/render-plan'
import fixture from '../fixtures/ash-noodles-wrist.json'
import modelUrl from '../../.cache/characters/noodles-hand/model.poffo?url'
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
const digest = async (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')

test.each([false, true])(
  'should keep the noodle hand and forearm joined without extending them (buffering=%s)',
  async (buffering) => {
    const loaded = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!loaded.ok) {
      throw new Error('Invalid Ash model')
    }
    const document = loaded.document
    const parts = new Map(document.parts.map((part) => [part.id, part]))
    const textures = new Map<string, Promise<string>>()
    for (const original of fixture.preservedParts) {
      const part = parts.get(original.id)!
      if (!textures.has(part.texture.src)) {
        textures.set(
          part.texture.src,
          fetch(part.texture.src)
            .then((response) => response.arrayBuffer())
            .then(digest),
        )
      }
      expect(await textures.get(part.texture.src), `${original.id}: original drawing`).toBe(
        original.texture,
      )
      expect(
        await digest(
          new TextEncoder().encode(
            JSON.stringify([
              Array.from(part.mesh.vertices),
              Array.from(part.mesh.uvs),
              Array.from(part.mesh.indices),
            ]),
          ).buffer,
        ),
        `${original.id}: original hand and arm shape`,
      ).toBe(original.mesh)
    }
    let canvas!: HTMLCanvasElement
    render(() => (
      <section aria-label="Noodle wrist review" class="h-175 w-225 bg-white">
        <canvas ref={canvas} class="h-full w-full" />
      </section>
    ))
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 1.5,
    })
    const current = player
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    const defaults = Object.fromEntries(
      document.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
    )
    const expression = document.expressions!.find((expression) => expression.id === '컵라면 들기')!
    const pose = Object.fromEntries(
      expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
    )
    const directions = [
      {},
      {Param57: 15, Param58: -12, Param61: 8, ParamAngleX: 30, ParamAngleZ: 20},
      {Param57: -15, Param58: 12, Param61: -8, ParamAngleX: -30, ParamAngleZ: -20},
    ]
    for (const [phase, coat] of [0, 1, 0, 1].entries()) {
      for (const [direction, movement] of directions.entries()) {
        const values = {...defaults, ...pose, ...movement, Param49: coat}
        current.patchParameterBlends(
          Object.fromEntries(
            Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
          ),
          'after-physics',
        )
        current.setViewCamera({x: 1930, y: 1450, zoom: 1.6})
        await flushPlayerInputs(current)
        const actual = Object.fromEntries(
          document.parameters!.map((parameter) => [
            parameter.id,
            current.getParameterValue(parameter.id)!,
          ]),
        )
        const frame = getPartRenderFrame(document, actual)
        const wrist = frame.plans.find((part) => part.partId === fixture.patch)!
        expect(
          wrist.visible && wrist.render && wrist.properties.opacity > 0,
          'New wrist is only visible without the coat',
        ).toBe(coat === 1)
        if (coat === 1) {
          const vertices = renderer.getPartVertices(fixture.patch)!
          if (direction === 0) {
            const used = [...new Set(parts.get(fixture.patch)!.mesh.indices)]
            const along = used.map((index) =>
              fixture.axis.reduce(
                (sum, value, axis) =>
                  sum + (vertices[index * 2 + axis]! - fixture.wrist[axis]!) * value,
                0,
              ),
            )
            expect(
              Math.min(...along),
              'Hand repair must stop at the wrist and never cover the forearm',
            ).toBeGreaterThan(-1)
            expect(Math.max(...along), 'Only the palm root is repaired').toBeLessThan(
              fixture.maximumAlong + 1,
            )
          }
          for (const sample of fixture.contacts) {
            const source = renderer.getPartVertices(sample.sourcePartId)!
            const point = [0, 1].map((axis) =>
              sample.triangle.reduce(
                (sum, vertex, corner) => sum + source[vertex * 2 + axis]! * sample.weights[corner]!,
                0,
              ),
            )
            expect(
              Math.hypot(
                vertices[sample.vertexIndex * 2]! - point[0]!,
                vertices[sample.vertexIndex * 2 + 1]! - point[1]!,
              ),
              `${sample.sourcePartId}: wrist follows the original surface`,
            ).toBeLessThan(0.03)
          }
        }
        if (phase === 3) {
          const hand = renderer.getPartVertices('ArtMesh49')!
          const used = [...new Set(parts.get('ArtMesh49')!.mesh.indices)]
          const xs = used.map((index) => hand[index * 2]!)
          const ys = used.map((index) => hand[index * 2 + 1]!)
          current.setViewCamera({
            x: (Math.min(...xs) + Math.max(...xs)) / 2 - 225,
            y: Math.max(...ys) - 250,
            zoom: 2,
          })
          await flushPlayerInputs(current)
          await page
            .getByRole('region', {name: 'Noodle wrist review'})
            .screenshot({path: `ash-noodle-wrist-${buffering}-${direction}.png`})
        }
      }
    }
  },
  60000,
)
