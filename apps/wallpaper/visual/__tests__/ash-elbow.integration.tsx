// oxlint-disable no-await-in-loop -- Each original pose is compared with the last displayed frame.
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
import reference from '../fixtures/ash-upper-arm.json'
import centers from '../fixtures/ash-elbow-centers.json'
import seam from '../fixtures/ash-elbow-seam.json'
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

const createSurfaceSampler = async (source: string) => {
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
      Math.round(uv[0]! * image.width),
      Math.round(uv[1]! * image.height),
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
  'should finish the elbow seam while preserving the arm thickness centers and upper-arm body (buffering=%s)',
  async (buffering) => {
    const prepared = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!prepared.ok) {
      throw new Error('Invalid Ash model')
    }
    const document = prepared.document
    const attachment = document.glue?.find(
      (glue) => glue.id === 'coat-free:notes-left:elbow-center:contact',
    )
    expect(attachment, 'The marked elbow points need an attachment').toBeDefined()
    expect(attachment!.first).toEqual({
      partId: centers.lower.partId,
      vertexIndex: centers.lower.originalVertexCount,
    })
    expect(attachment!.second).toEqual({
      partId: centers.upper.partId,
      vertexIndex: centers.upper.originalVertexCount,
    })
    const upperPart = document.parts.find((part) => part.id === centers.upper.partId)!
    const lowerPart = document.parts.find((part) => part.id === centers.lower.partId)!
    const samplers = new Map([
      [upperPart.id, await createSurfaceSampler(upperPart.texture.src)],
      [lowerPart.id, await createSurfaceSampler(lowerPart.texture.src)],
    ])
    for (const center of [centers.upper, centers.lower]) {
      expect(
        samplers.get(center.partId)!(center.uv),
        'The center belongs to the actual painted surface',
      ).toBeGreaterThan(128)
      expect(center.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1)
      expect(Math.min(...center.weights)).toBeGreaterThan(0)
    }
    let canvas!: HTMLCanvasElement
    render(() => (
      <div aria-label="Restored upper arm" class="h-100 w-80 bg-white">
        <canvas ref={canvas} class="h-full w-full" />
      </div>
    ))
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      onAfterRender: () => undefined,
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 2,
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    current.setViewCamera({x: 1450, y: 1450, zoom: 0.5})
    for (const [index, sample] of reference.samples.entries()) {
      const values = {...reference.values, ...sample.overrides}
      current.patchParameterBlends(
        Object.fromEntries(
          Object.entries(values).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
        ),
        'after-physics',
      )
      await flushPlayerInputs(current)
      const actual = renderer.getPartVertices(reference.partId)!
      expect(actual.length).toBe(sample.vertices.length + 2)
      const maximumError = Math.max(
        ...sample.vertices.flatMap((coordinate, offset) =>
          Math.floor(offset / 2) === seam.vertexIndex
            ? []
            : [Math.abs(actual[offset]! - coordinate)],
        ),
      )
      expect(maximumError, JSON.stringify({index, overrides: sample.overrides})).toBeLessThan(0.01)
      expect(
        Math.hypot(
          ...[0, 1].map(
            (axis) =>
              actual[seam.vertexIndex * 2 + axis]! - sample.vertices[seam.vertexIndex * 2 + axis]!,
          ),
        ),
      ).toBeLessThan(seam.maximumWorldShift)
      const lower = renderer.getPartVertices(attachment!.first.partId)!
      const upper = renderer.getPartVertices(reference.partId)!
      const target = attachment!.second
      const error = Math.hypot(
        ...[0, 1].map(
          (axis) =>
            lower[attachment!.first.vertexIndex * 2 + axis]! -
            upper[target.vertexIndex * 2 + axis]!,
        ),
      )
      expect(
        error,
        'The lower-arm thickness center meets the upper-arm terminal center',
      ).toBeLessThan(0.01)
      for (const [center, anchor] of [
        [centers.lower, attachment!.first],
        [centers.upper, attachment!.second],
      ] as const) {
        const vertices = renderer.getPartVertices(center.partId)!
        const offset = [0, 1].map(
          (axis) =>
            center.triangle.reduce(
              (sum, vertex, index) => sum + vertices[vertex * 2 + axis]! * center.weights[index]!,
              0,
            ) - vertices[anchor.vertexIndex * 2 + axis]!,
        )
        expect(
          Math.hypot(...offset),
          'The connection follows its painted triangle center',
        ).toBeLessThan(0.01)
      }
      const tip = [0, 1].map((axis) =>
        seam.tip.triangle.reduce(
          (sum, vertex, offset) => sum + upper[vertex * 2 + axis]! * seam.tip.weights[offset]!,
          0,
        ),
      )
      const cover = meshPoint({
        indices: lowerPart.mesh.indices,
        point: {x: tip[0]!, y: tip[1]!},
        vertices: lower,
      })
      expect(cover, 'The upper-arm contour end overlaps the forearm').toBeDefined()
      const uv = [0, 1].map((axis) =>
        cover!.indices.reduce(
          (sum, vertex, offset) =>
            sum + lowerPart.mesh.uvs[vertex * 2 + axis]! * cover!.weights[offset]!,
          0,
        ),
      )
      expect(
        samplers.get(lowerPart.id)!(uv),
        'The painted forearm covers the protruding contour end',
      ).toBeGreaterThan(192)
      if (index === 0 && !buffering) {
        await page
          .getByLabelText('Restored upper arm')
          .screenshot({path: '__screenshots__/ash-elbow-center.png'})
      }
    }
    expect(
      document.glue?.filter(
        (glue) =>
          glue.first.partId === reference.partId &&
          glue.first.vertexIndex < centers.upper.originalVertexCount,
      ),
    ).toEqual([])
    expect(
      document.parameterBindings?.find(
        (binding) => binding.id === 'coat-free:notes-left:arm-placement',
      )?.targetPartIds,
    ).not.toContain(reference.partId)
  },
  60_000,
)
