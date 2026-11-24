// oxlint-disable no-await-in-loop -- One player exercises the same joints through wardrobe and physics states.
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
import {meshPoint} from '../../../../packages/puppet/src/player/internal/mesh-point'
import {getPartRenderFrame} from '../../../../packages/puppet/src/player/internal/render-plan'
import joints from '../fixtures/ash-wrists.json'
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
const digest = async (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
const textDigest = (value: string) => digest(new TextEncoder().encode(value).buffer)
const createPixelSampler = async (source: string) => {
  const image = new Image()
  image.src = source
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')!
  return (uv: readonly number[]) => {
    context.clearRect(0, 0, 1, 1)
    context.drawImage(
      image,
      Math.floor(uv[0]! * image.width),
      Math.floor(uv[1]! * image.height),
      1,
      1,
      0,
      0,
      1,
      1,
    )
    return context.getImageData(0, 0, 1, 1).data
  }
}
const createAlphaSampler = async (source: string) => {
  const pixel = await createPixelSampler(source)
  return (uv: readonly number[]) => pixel(uv)[3]!
}

test.each([false, true])(
  'should join original hands at their wrist ends (buffering=%s)',
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
    const alpha = new Map<string, Awaited<ReturnType<typeof createAlphaSampler>>>()
    for (const id of joints.contours.flatMap((contour) => contour.coveringPartIds)) {
      const part = parts.get(id)!
      if (!alpha.has(part.texture.src)) {
        alpha.set(part.texture.src, await createAlphaSampler(part.texture.src))
      }
    }
    for (const original of joints.preservedParts) {
      const part = parts.get(original.id)!
      if (!textures.has(part.texture.src)) {
        textures.set(
          part.texture.src,
          fetch(part.texture.src)
            .then((response) => response.arrayBuffer())
            .then(digest),
        )
      }
      expect(await textures.get(part.texture.src), `${original.id}: original illustration`).toBe(
        original.texture,
      )
      expect(
        await textDigest(
          JSON.stringify([
            Array.from(part.mesh.vertices),
            Array.from(part.mesh.uvs),
            Array.from(part.mesh.indices),
          ]),
        ),
        `${original.id}: original hand shape`,
      ).toBe(original.mesh)
    }
    const coffeePixel = await createPixelSampler(parts.get(joints.wristPatch.id)!.texture.src)
    for (const sample of joints.wristPatch.cupArtwork) {
      const pixel = coffeePixel([sample.x / 1024, sample.y / 1536])
      for (const [channel, expected] of sample.rgb.entries()) {
        expect(
          Math.abs(pixel[channel]! - expected),
          `Original cup remains visible between palm and fingers at ${sample.x},${sample.y}`,
        ).toBeLessThanOrEqual(2)
      }
    }
    let canvas!: HTMLCanvasElement
    render(() => (
      <section aria-label="Original wrist review" class="h-175 w-225 bg-white">
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
    const directions = [
      {},
      {Param57: 15, Param58: -12, Param61: 8, ParamAngleX: 30, ParamAngleZ: 20},
      {Param57: -15, Param58: 12, Param61: -8, ParamAngleX: -30, ParamAngleZ: -20},
    ]
    const point = (surface: {
      partId: string
      triangle: readonly number[]
      weights: readonly number[]
    }) => {
      const vertices = renderer.getPartVertices(surface.partId)!
      return [0, 1].map((axis) =>
        surface.triangle.reduce(
          (sum, index, corner) => sum + vertices[index * 2 + axis]! * surface.weights[corner]!,
          0,
        ),
      )
    }
    const apply = async (expressionId: string, coat: number, direction: number) => {
      const expression = document.expressions!.find((expression) => expression.id === expressionId)!
      const values = {
        ...defaults,
        ...Object.fromEntries(
          expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
        ),
        ...directions[direction],
        Param49: coat,
      }
      current.patchParameterBlends(
        Object.fromEntries(
          Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
        ),
        'after-physics',
      )
      await flushPlayerInputs(current)
    }
    type Wrist = (typeof joints.records)[number]
    const expectWristSurface = (action: string, coat: number) => {
      const values = Object.fromEntries(
        document.parameters!.map((parameter) => [
          parameter.id,
          current.getParameterValue(parameter.id)!,
        ]),
      )
      const frame = getPartRenderFrame(document, values)
      const expected = action === 'coffee' && coat === 1
      // The approved model owns the wrist with the hand and forearm; no intermediate skin part.
      expect(parts.has('coat-free:coffee-left:wrist-arm')).toBe(false)
      for (const id of [joints.wristPatch.id, joints.wristPatch.armId]) {
        const plan = frame.plans.find((part) => part.partId === id)!
        const opacity =
          plan.properties.opacity *
          plan.layerIds.reduce(
            (value, id) => value * (frame.layers.get(id)?.properties.opacity ?? 1),
            1,
          )
        expect(plan.visible && opacity > 0.01, 'Coffee wrist stays in its own action').toBe(
          expected,
        )
      }
      if (expected) {
        for (const contact of joints.wristPatch.contacts) {
          const arm = renderer.getPartVertices(joints.wristPatch.armId)!
          const hand = point(contact.hand)
          expect(
            Math.hypot(arm[contact.arm * 2]! - hand[0]!, arm[contact.arm * 2 + 1]! - hand[1]!),
            'Authored hand and forearm surface contacts stay attached',
          ).toBeLessThan(0.03)
        }
      }
    }
    const expectWristContour = (row: Wrist) => {
      const contour = joints.contours.find((contour) => contour.group === row.group)
      if (contour === undefined) {
        return
      }
      const values = Object.fromEntries(
        document.parameters!.map((parameter) => [
          parameter.id,
          current.getParameterValue(parameter.id)!,
        ]),
      )
      const frame = getPartRenderFrame(document, values)
      const source = frame.plans.find((part) => part.partId === contour.forearmTip.partId)!
      const opacity =
        source.visible && source.render
          ? source.properties.opacity *
            source.layerIds.reduce(
              (value, id) => value * (frame.layers.get(id)?.properties.opacity ?? 1),
              1,
            )
          : 0
      const tip = point(contour.forearmTip)
      const coverage = contour.coveringPartIds.map((id) => {
        const part = parts.get(id)!
        const hit = meshPoint({
          indices: part.mesh.indices,
          point: {x: tip[0]!, y: tip[1]!},
          vertices: renderer.getPartVertices(id)!,
        })
        if (hit === undefined) {
          return 0
        }
        const uv = [0, 1].map((axis) =>
          hit.indices.reduce(
            (sum, index, corner) => sum + part.mesh.uvs[index * 2 + axis]! * hit.weights[corner]!,
            0,
          ),
        )
        return alpha.get(part.texture.src)!(uv)
      })
      // The current two-part model hides the old cap; exposed caps must still be covered.
      expect(
        opacity <= 0.01 || Math.max(...coverage) > 230,
        `${row.group}: old forearm contour is hidden or covered`,
      ).toBe(true)
    }
    const expectWristContacts = (rows: readonly Wrist[]) => {
      for (const row of rows) {
        const hand = point(row.hand)
        const wrist = point(row.wrist)
        expect(
          Math.hypot(hand[0]! - wrist[0]!, hand[1]! - wrist[1]!),
          `${row.group}: painted wrist contact`,
        ).toBeLessThan(0.03)
        expectWristContour(row)
      }
    }
    const focusWrists = async (rows: readonly Wrist[], direction: number) => {
      if (direction === 0) {
        return
      }
      const points = rows.flatMap((row) => {
        const part = parts.get(row.hand.partId)!
        const vertices = renderer.getPartVertices(part.id)!
        return [...new Set(part.mesh.indices)].map((index) => [
          vertices[index * 2]!,
          vertices[index * 2 + 1]!,
        ])
      })
      const left = Math.min(...points.map((point) => point[0]!))
      const right = Math.max(...points.map((point) => point[0]!))
      const top = Math.min(...points.map((point) => point[1]!))
      const bottom = Math.max(...points.map((point) => point[1]!))
      const zoom = Math.min(1.05, 800 / (right - left + 160), 600 / (bottom - top + 160))
      current.setViewCamera({
        x: (left + right) / 2 - 450 / zoom,
        y: (top + bottom) / 2 - 350 / zoom,
        zoom,
      })
      await flushPlayerInputs(current)
    }
    const captureContours = async (rows: readonly Wrist[], direction: number) => {
      const selected = rows.filter((row) =>
        joints.contours.some((contour) => contour.group === row.group),
      )
      for (const row of selected) {
        const wrist = point(row.wrist)
        current.setViewCamera({x: wrist[0]! - 225, y: wrist[1]! - 175, zoom: 2})
        await flushPlayerInputs(current)
        await page.getByRole('region', {name: 'Original wrist review'}).screenshot({
          path: `ash-wrist-contours-${buffering}-${row.group}-${direction}.png`,
        })
      }
    }
    for (const action of joints.actions) {
      const rows = joints.records.filter((row) => row.action === action.id)
      for (const [phase, coat] of [0, 1, 0, 1].entries()) {
        for (const direction of [0, 1, 2]) {
          current.setViewCamera({x: 1800, y: 1020, zoom: 0.7})
          await apply(action.expression, coat, direction)
          expectWristSurface(action.id, coat)
          if (coat === 1) {
            expectWristContacts(rows)
          }
          if (coat === 0 && phase === 2 && direction === 0) {
            await page
              .getByRole('region', {name: 'Original wrist review'})
              .screenshot({path: `ash-wrist-joints-${buffering}-${action.id}-coat.png`})
          }
          if (coat === 1 && phase === 3) {
            await focusWrists(rows, direction)
            await page
              .getByRole('region', {name: 'Original wrist review'})
              .screenshot({path: `ash-wrist-joints-${buffering}-${action.id}-${direction}.png`})
            await captureContours(rows, direction)
          }
        }
      }
    }
    for (const action of joints.protectedActions) {
      current.setViewCamera({x: 1800, y: 1020, zoom: 0.7})
      await apply(action.expression, 1, 0)
      await page
        .getByRole('region', {name: 'Original wrist review'})
        .screenshot({path: `ash-wrist-joints-${buffering}-${action.id}-original.png`})
    }
  },
  120000,
)
