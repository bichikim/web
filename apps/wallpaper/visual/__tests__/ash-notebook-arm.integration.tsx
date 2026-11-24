// oxlint-disable no-await-in-loop -- The same real player checks each pose and head reversal in order.
import {cleanup, render} from '@solidjs/testing-library'
import {For} from 'solid-js'
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
import poses from '../fixtures/ash-upper-arm.json'
import reference from '../fixtures/ash-notebook-poses.json'
import arm from '../fixtures/ash-notebook-arm.json'
import wrist from '../fixtures/ash-notebook-wrist.json'
import notebookPose from '../fixtures/ash-notebook-pose.json'
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
  'should join the notebook supporting arm without stretching the arm, hand or notebook (buffering=%s)',
  async (buffering) => {
    const loaded = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!loaded.ok) {
      throw new Error('Invalid Ash')
    }
    const document = loaded.document
    expect(
      document.glue?.filter(
        (link) =>
          link.id.startsWith('coat-free:notes-right:wrist:') && link.first.partId === wrist.arm,
      ),
      'The forearm must keep its original shape; position the hand instead',
    ).toEqual([])
    expect(document.parts.findIndex((part) => part.id === wrist.arm)).toBeLessThan(
      document.parts.findIndex((part) => part.id === wrist.hand),
    )
    expect(document.glue?.find((link) => link.id === wrist.contact.id)).toEqual(wrist.contact)
    const contact = document.glue?.find(
      (glue) => glue.id === 'coat-free:notes-right:elbow-center:contact',
    )
    expect(contact, 'The notebook supporting arm needs its own elbow attachment').toBeDefined()
    expect(contact!.first).toEqual({
      partId: arm.centers.lower.partId,
      vertexIndex: arm.centers.lower.originalVertexCount,
    })
    expect(contact!.second).toEqual({
      partId: arm.centers.upper.partId,
      vertexIndex: arm.centers.upper.originalVertexCount,
    })
    const upperPart = document.parts.find((part) => part.id === arm.centers.upper.partId)!
    const lowerPart = document.parts.find((part) => part.id === arm.centers.lower.partId)!
    const handPart = document.parts.find((part) => part.id === wrist.hand)!
    const upperAlpha = await createSurfaceSampler(upperPart.texture.src)
    const lowerAlpha = await createSurfaceSampler(lowerPart.texture.src)
    const handAlpha = await createSurfaceSampler(handPart.texture.src)
    expect(upperAlpha(arm.centers.upper.uv), 'The upper-arm center is painted').toBeGreaterThan(128)
    expect(lowerAlpha(arm.centers.lower.uv), 'The forearm center is painted').toBeGreaterThan(128)
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-130 w-100 bg-white">
        <canvas ref={canvas} aria-label="Notebook supporting arm" class="h-full w-full" />
      </div>
    ))
    interface Frame {
      readonly gap: number
      readonly centerError: number
      readonly coverage: number
      readonly wristError: number
      readonly wristCoverage: number
      readonly image: string
    }
    let pending: {start: number; resolve: (frame: Frame) => void} | undefined
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      onAfterRender: () => {
        if (
          pending !== undefined &&
          Math.abs((current.getParameterValue('Param57') ?? 0) - pending.start) >= 0.4
        ) {
          const {resolve} = pending
          pending = undefined
          resolve(readFrame())
        }
      },
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 1.5,
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    const readFrame = (): Frame => {
      const upper = renderer.getPartVertices(upperPart.id)!
      const lower = renderer.getPartVertices(lowerPart.id)!
      const gap = Math.hypot(
        ...[0, 1].map(
          (axis) =>
            upper[contact!.second.vertexIndex * 2 + axis]! -
            lower[contact!.first.vertexIndex * 2 + axis]!,
        ),
      )
      const centerError = Math.max(
        ...(
          [
            [arm.centers.upper, upper, contact!.second],
            [arm.centers.lower, lower, contact!.first],
          ] as const
        ).map(([center, vertices, anchor]) =>
          Math.hypot(
            ...[0, 1].map(
              (axis) =>
                center.triangle.reduce(
                  (sum, vertex, index) =>
                    sum + vertices[vertex * 2 + axis]! * center.weights[index]!,
                  0,
                ) - vertices[anchor.vertexIndex * 2 + axis]!,
            ),
          ),
        ),
      )
      const tip = [0, 1].map((axis) =>
        arm.seam.triangle.reduce(
          (sum, vertex, index) => sum + upper[vertex * 2 + axis]! * arm.seam.weights[index]!,
          0,
        ),
      )
      const point = meshPoint({
        indices: lowerPart.mesh.indices,
        point: {x: tip[0]!, y: tip[1]!},
        vertices: lower,
      })
      const coverage =
        point === undefined
          ? 0
          : lowerAlpha(
              [0, 1].map((axis) =>
                point.indices.reduce(
                  (sum, vertex, index) =>
                    sum + lowerPart.mesh.uvs[vertex * 2 + axis]! * point.weights[index]!,
                  0,
                ),
              ),
            )
      const handVertices = renderer.getPartVertices(wrist.hand)!
      const wristCenter = (role: 'hand' | 'arm') => {
        const center = wrist.centers[role]
        const vertices = role === 'hand' ? handVertices : lower
        return [0, 1].map((axis) =>
          center.triangle.reduce(
            (sum, vertex, index) => sum + vertices[vertex * 2 + axis]! * center.weights[index]!,
            0,
          ),
        )
      }
      const handCenter = wristCenter('hand')
      const armCenter = wristCenter('arm')
      const wristError = Math.hypot(...handCenter.map((value, axis) => value - armCenter[axis]!))
      const wristCoverage = Math.min(
        ...wrist.paintedCapLandmarks.map((mark) => {
          const target = [0, 1].map((axis) =>
            mark.indices.reduce(
              (sum, vertex, index) => sum + lower[vertex * 2 + axis]! * mark.weights[index]!,
              0,
            ),
          )
          const hit = meshPoint({
            indices: handPart.mesh.indices,
            point: {x: target[0]!, y: target[1]!},
            vertices: handVertices,
          })
          if (hit === undefined) {
            return 0
          }
          return handAlpha(
            [0, 1].map((axis) =>
              hit.indices.reduce(
                (sum, vertex, index) =>
                  sum + handPart.mesh.uvs[vertex * 2 + axis]! * hit.weights[index]!,
                0,
              ),
            ),
          )
        }),
      )
      return {centerError, coverage, gap, image: canvas.toDataURL(), wristCoverage, wristError}
    }
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    current.setViewCamera({x: 2300, y: 1100, zoom: 0.4})
    expect(reference.samples).toHaveLength(poses.samples.length)
    for (const [index, pose] of poses.samples.entries()) {
      current.patchParameterBlends(
        Object.fromEntries(
          Object.entries({...poses.values, ...pose.overrides}).map(([id, value]) => [
            id,
            {mode: 'overwrite' as const, value},
          ]),
        ),
        'after-physics',
      )
      await flushPlayerInputs(current)
      const before = reference.samples[index]!
      const lower = renderer.getPartVertices(lowerPart.id)!
      const delta = [0, 1].map(
        (axis) => lower[102 + axis]! - before['coat-free:notes-right:ArtMesh994'][102 + axis]!,
      )
      const handVertices = renderer.getPartVertices(wrist.hand)!
      const handDelta = [0, 1].map((axis) => handVertices[axis]! - before.ArtMesh125[axis]!)
      for (const id of reference.parts) {
        const original = before[id as keyof typeof before]
        const actual = renderer.getPartVertices(id)!
        expect(actual.length).toBe(original.length + 2)
        if (id === 'ArtMesh128') {
          const grip = (vertices: ArrayLike<number>, axis: number) =>
            vertices[axis]! + (vertices[axis + 2]! - vertices[axis]!) * 0.55
          expect(
            Math.hypot(
              ...[0, 1].map((axis) => grip(actual, axis) - grip(original, axis) - handDelta[axis]!),
            ),
            'The smaller notebook keeps the same grip through native perspective warps',
          ).toBeLessThan(1)
          for (const [first, second] of [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [0, 2],
            [1, 3],
          ]) {
            const distance = (vertices: ArrayLike<number>) =>
              Math.hypot(
                vertices[first! * 2]! - vertices[second! * 2]!,
                vertices[first! * 2 + 1]! - vertices[second! * 2 + 1]!,
              )
            expect(
              distance(actual) / distance(original),
              'The notebook retains its proportions',
            ).toBeCloseTo(notebookPose.scale, 2)
          }
        } else {
          for (const [offset, coordinate] of original.entries()) {
            const seam = id === upperPart.id && Math.floor(offset / 2) === 13
            const movement = id === upperPart.id ? [0, 0] : id === wrist.arm ? delta : handDelta
            const expected = coordinate + movement[offset % 2]!
            expect(Math.abs(actual[offset]! - expected), `${id} keeps its shape`).toBeLessThan(
              seam ? arm.maximumSeamShift : 0.01,
            )
          }
        }
      }
      const frame = readFrame()
      expect(frame.gap, `Pose ${index}: elbow contact`).toBeLessThan(0.01)
      expect(frame.centerError, `Pose ${index}: painted centers`).toBeLessThan(0.01)
      expect(frame.coverage, `Pose ${index}: contour end covered`).toBeGreaterThan(192)
      expect(frame.wristError, `Pose ${index}: hand wrist attachment`).toBeLessThan(0.01)
      expect(frame.wristCoverage, `Pose ${index}: painted wrist contact`).toBeGreaterThan(192)
    }
    current.patchParameterBlends(
      Object.fromEntries(document.parameters!.map((parameter) => [parameter.id, undefined])),
      'after-physics',
    )
    current.setPhysicsPreview(true)
    current.resetPhysics()
    const values = {
      ...Object.fromEntries(
        document.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
      ),
      ...Object.fromEntries(
        document
          .expressions!.find((expression) => expression.id === '노트 들기')!
          .parameters.map((parameter) => [parameter.parameterId, parameter.value]),
      ),
      Param49: 1,
    }
    current.setParameterValues(values)
    await flushPlayerInputs(current)
    const images: string[] = []
    const nextPhysicsFrame = () =>
      new Promise<Frame>((resolve) => {
        pending = {resolve, start: current.getParameterValue('Param57') ?? 0}
      })
    for (const direction of [1, -1, 1]) {
      const rendered = nextPhysicsFrame()
      current.setParameterValues({
        ...values,
        ParamAngleX: direction * 30,
        ParamAngleZ: direction * 20,
      })
      current.resume()
      const frame = await rendered
      current.pause()
      expect(frame.gap, 'The elbow follows live head physics').toBeLessThan(0.01)
      expect(frame.centerError, 'The painted centers follow live head physics').toBeLessThan(0.01)
      expect(frame.coverage, 'The contour remains covered during physics').toBeGreaterThan(192)
      expect(frame.wristError, 'The wrist remains joined during physics').toBeLessThan(0.01)
      expect(
        frame.wristCoverage,
        'The painted wrist remains joined during physics',
      ).toBeGreaterThan(192)
      images.push(frame.image)
    }
    if (!buffering) {
      render(() => (
        <section aria-label="Notebook arm live physics" class="flex w-225 bg-white">
          <For each={images}>
            {(src, index) => <img src={src} alt={`Head reversal ${index() + 1}`} class="w-75" />}
          </For>
        </section>
      ))
      await page
        .getByRole('region', {name: 'Notebook arm live physics'})
        .screenshot({path: '__screenshots__/ash-notebook-arm-live.png'})
    }
  },
  60_000,
)
