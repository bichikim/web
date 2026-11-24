// oxlint-disable no-await-in-loop -- Each pose and physics reversal uses the same real player.
import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
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
import {meshPoint} from '../../../../packages/puppet/src/player/internal/mesh-point'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import actions from '../fixtures/ash-arm-actions.json'
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
interface SurfacePoint {
  readonly triangle: ReadonlyArray<number>
  readonly weights: ReadonlyArray<number>
}
const center = (surface: SurfacePoint, vertices: ArrayLike<number>) =>
  [0, 1].map((axis) =>
    surface.triangle.reduce(
      (sum, index, i) => sum + vertices[index * 2 + axis]! * surface.weights[i]!,
      0,
    ),
  )
const distance = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  Math.hypot(...first.map((value, i) => value - second[i]!))
const createAlphaSampler = async (source: string) => {
  const image = new Image()
  image.src = source
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d')!
  return (uv: ReadonlyArray<number>) => {
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
    return context.getImageData(0, 0, 1, 1).data[3]!
  }
}
test.each([false, true])(
  'should keep displayed arm joints through poses, fades and live physics (buffering=%s)',
  async (buffering) => {
    const loaded = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!loaded.ok) {
      throw new Error('Invalid Ash')
    }
    const model = loaded.document
    const byId = new Map(model.parts.map((part) => [part.id, part]))
    const alpha = new Map<string, Awaited<ReturnType<typeof createAlphaSampler>>>()
    for (const branch of actions.flatMap((action) => action.branches)) {
      const part = byId.get(branch.arm)!
      if (!alpha.has(part.texture.src)) {
        alpha.set(part.texture.src, await createAlphaSampler(part.texture.src))
      }
    }
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-137.5 w-112.5">
        <canvas ref={canvas} class="h-full w-full" />
      </div>
    ))
    let pending: {readonly start: number; readonly resolve: () => void} | undefined
    player = await createPlayer({
      buffering,
      canvas,
      document: model,
      framing: 'viewport',
      onAfterRender: () => {
        if (
          pending !== undefined &&
          Math.abs((player!.getParameterValue('Param57') ?? 0) - pending.start) >= 0.4
        ) {
          const {resolve} = pending
          pending = undefined
          resolve()
        }
      },
      physicsPreview: false,
      renderer: 'pixi-webgl',
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    let preparedFrame: PartRenderFrame | undefined
    const apply = renderer.applyPreparedFrame.bind(renderer)
    vi.spyOn(renderer, 'applyPreparedFrame').mockImplementation((prepared) => {
      preparedFrame = prepared.frame
      apply(prepared)
    })
    const frame = () =>
      buffering
        ? preparedFrame!
        : getPartRenderFrame(
            model,
            Object.fromEntries(
              model.parameters!.map((parameter) => [
                parameter.id,
                current.getParameterValue(parameter.id) ?? parameter.defaultValue,
              ]),
            ),
          )
    const opacity = (id: string) => {
      const actual = frame()
      const plan = actual.plans.find((plan) => plan.partId === id)
      return plan?.visible
        ? plan.properties.opacity *
            plan.layerIds.reduce(
              (value, id) => value * (actual.layers.get(id)?.properties.opacity ?? 1),
              1,
            )
        : 0
    }
    const vertices = (id: string) => renderer.getPartVertices(id)!
    const checkContacts = (
      action: (typeof actions)[number],
      progress: number,
      contour: boolean,
    ) => {
      for (const branch of action.branches) {
        expect(
          opacity(branch.upper.partId),
          `${branch.group}: upper arm is displayed`,
        ).toBeGreaterThan(progress * 0.9)
        expect(
          opacity(branch.arm),
          `${branch.group}: forearm appears with the upper arm`,
        ).toBeGreaterThan(progress * 0.9)
        expect(
          distance(
            center(branch.elbowTarget, vertices(branch.elbowTarget.partId)),
            center(branch.elbow, vertices(branch.arm)),
          ),
          `${branch.group}: elbow`,
        ).toBeLessThan(0.01)
        expect(
          distance(
            center(branch.wrist, vertices(branch.arm)),
            center(branch.hand, vertices(branch.hand.partId)),
          ),
          `${branch.group}: wrist`,
        ).toBeLessThan(0.01)
        for (const row of branch.rows) {
          if (row.strength === 1) {
            expect(
              distance(
                Array.from(vertices(row.partId)).slice(
                  row.vertexIndex * 2,
                  row.vertexIndex * 2 + 2,
                ),
                Array.from(vertices(branch.guideId)).slice(
                  row.guideVertexIndex * 2,
                  row.guideVertexIndex * 2 + 2,
                ),
              ),
              `${branch.group}: wrist surface`,
            ).toBeLessThan(0.01)
          }
        }
        if (contour) {
          const tip = center(branch.seam, vertices(branch.upper.partId))
          const part = byId.get(branch.arm)!
          const hit = meshPoint({
            indices: part.mesh.indices,
            point: {x: tip[0]!, y: tip[1]!},
            vertices: vertices(part.id),
          })
          const coverage =
            hit === undefined
              ? 0
              : alpha.get(part.texture.src)!(
                  center({triangle: hit.indices, weights: hit.weights}, part.mesh.uvs),
                )
          expect(coverage, `${branch.group}: painted upper-arm tip is covered`).toBeGreaterThan(192)
        }
      }
    }
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    const defaults = Object.fromEntries(
      model.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
    )
    const nextPhysicsFrame = () =>
      new Promise<void>((resolve) => {
        pending = {resolve, start: current.getParameterValue('Param57') ?? 0}
      })
    for (const action of actions) {
      const expression = model.expressions!.find(
        (expression) => expression.id === action.expression,
      )!
      for (const progress of [0.25, 0.5, 1]) {
        const values = {
          ...defaults,
          ...Object.fromEntries(
            expression.parameters.map((parameter) => [
              parameter.parameterId,
              parameter.value * progress,
            ]),
          ),
          Param49: 1,
        }
        current.patchParameterBlends(
          Object.fromEntries(
            Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
          ),
          'after-physics',
        )
        await flushPlayerInputs(current)
        checkContacts(action, progress, progress === 1)
      }
      const rest = new Map(
        action.branches.map((branch) => [branch.arm, Array.from(vertices(branch.arm))]),
      )
      current.patchParameterBlends(
        Object.fromEntries(model.parameters!.map((parameter) => [parameter.id, undefined])),
        'after-physics',
      )
      const values = {
        ...defaults,
        ...Object.fromEntries(
          expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
        ),
        Param49: 1,
      }
      current.setParameterValues(values)
      current.setPhysicsPreview(true)
      current.resetPhysics()
      await flushPlayerInputs(current)
      for (const direction of [1, -1, 1]) {
        const rendered = nextPhysicsFrame()
        current.setParameterValues({
          ...values,
          ParamAngleX: direction * 30,
          ParamAngleZ: direction * 20,
        })
        current.resume()
        await rendered
        current.pause()
        // A buffered pause is an input; inspect the geometry after its frame is presented.
        await flushPlayerInputs(current)
        checkContacts(action, 1, true)
        for (const branch of action.branches) {
          const base = rest.get(branch.arm)!
          const actual = vertices(branch.arm)
          const start = branch.core[0]!
          const length = (points: ArrayLike<number>, index: number) =>
            Math.hypot(
              points[index * 2]! - points[start * 2]!,
              points[index * 2 + 1]! - points[start * 2 + 1]!,
            )
          const error = Math.max(
            ...branch.core.map((index) => Math.abs(length(actual, index) - length(base, index))),
          )
          expect(error, `${branch.group}: physics preserves rigid forearm core`).toBeLessThan(0.02)
        }
      }
      current.setPhysicsPreview(false)
    }
  },
  120_000,
)
