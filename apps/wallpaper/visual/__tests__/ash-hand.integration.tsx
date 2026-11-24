// oxlint-disable no-await-in-loop -- Input revisions and their rendered wrist must be observed in sequence.
import {cleanup, render} from '@solidjs/testing-library'
import {For} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {
  createPlayer,
  flushPlayerInputs,
  getScenePartStates,
  type Player,
  preparePuppetDocument,
  type PuppetSceneNode,
} from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import modelUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import selectedUrl from '../../asset-library/characters/ash/coat-free-arms/hand.png?url'
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

const digest = async (url: string) => {
  const source = await fetch(url).then((response) => response.arrayBuffer())
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', source)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
const pixels = async (source: string) => {
  const image = new Image()
  image.src = source
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, image.width, image.height)
}
const visitNeighbors = (image: ImageData, pixel: number, visit: (neighbor: number) => void) => {
  const column = pixel % image.width
  const row = Math.floor(pixel / image.width)
  for (let y = Math.max(0, row - 1); y <= Math.min(image.height - 1, row + 1); y += 1) {
    for (let x = Math.max(0, column - 1); x <= Math.min(image.width - 1, column + 1); x += 1) {
      visit(y * image.width + x)
    }
  }
}
const componentSize = (image: ImageData, seen: Uint8Array, pending: Int32Array, pixel: number) => {
  let head = 0
  let tail = 0
  const visit = (neighbor: number) => {
    if (seen[neighbor] === 0 && image.data[neighbor * 4 + 3]! > 192) {
      seen[neighbor] = 1
      pending[tail] = neighbor
      tail += 1
    }
  }
  visit(pixel)
  while (head < tail) {
    visitNeighbors(image, pending[head]!, visit)
    head += 1
  }
  return tail
}
const components = (image: ImageData) => {
  const seen = new Uint8Array(image.width * image.height)
  const pending = new Int32Array(seen.length)
  const sizes: number[] = []
  for (let pixel = 0; pixel < seen.length; pixel += 1) {
    if (seen[pixel] === 0 && image.data[pixel * 4 + 3]! > 192) {
      const size = componentSize(image, seen, pending, pixel)
      if (size >= 100) {
        sizes.push(size)
      }
    }
  }
  return sizes.toSorted((a, b) => b - a)
}
const hiddenBranches = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  kept: ReadonlySet<string>,
): Array<{id: string; kind: 'group' | 'part'}> => {
  const containsKept = (node: PuppetSceneNode): boolean =>
    node.kind === 'part' ? kept.has(node.id) : node.children.some(containsKept)
  return nodes.flatMap<{id: string; kind: 'group' | 'part'}>((node) => {
    if (node.kind === 'group' && !containsKept(node)) {
      return [{id: node.id, kind: 'group' as const}]
    }
    if (node.kind === 'part') {
      return kept.has(node.id) ? [] : [{id: node.id, kind: 'part' as const}]
    }
    return hiddenBranches(node.children, kept)
  })
}

test.each([false, true])(
  'should preserve the original pen hand and join the hand directly to the forearm while writing (buffering=%s)',
  async (buffering) => {
    const prepared = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!prepared.ok) {
      throw new Error('Invalid Ash')
    }
    const document = prepared.document
    const id = 'coat-free:notes-left:hand'
    const hand = document.parts.find((part) => part.id === id)
    expect(hand, 'The missing hand back must be present').toBeDefined()
    expect(await digest(hand!.texture.src)).toBe(await digest(selectedUrl))
    const texturePixels = await pixels(hand!.texture.src)
    const removedWrist = texturePixels.data.subarray(
      4 * texturePixels.width * Math.floor(texturePixels.height * 0.76),
    )
    expect(
      removedWrist.some((value, index) => index % 4 === 3 && value !== 0),
      'The surplus generated wrist and forearm are transparent',
    ).toBe(false)
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-150 w-100">
        <canvas ref={canvas} aria-label="Ash hand and forearm join" class="h-full w-full" />
      </div>
    ))
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      physicsPreview: false,
      renderer: 'pixi-webgl',
      resolution: 2,
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    const expression = document.expressions!.find((expression) => expression.id === '노트 들기')!
    const values = {
      ...Object.fromEntries(
        document.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
      ),
      ...Object.fromEntries(
        expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
      ),
      Param49: 1,
    }
    const keep = new Set([
      id,
      'ArtMesh136',
      'ArtMesh137',
      'ArtMesh139',
      'coat-free:notes-left:ArtMesh900',
      'coat-free:notes-left:ArtMesh901',
    ])
    for (const branch of hiddenBranches(document.scene!.roots, keep)) {
      const accepted =
        branch.kind === 'group'
          ? current.setGroupOverride(branch.id, {opacity: 0})
          : current.setPartOverride(branch.id, {opacity: 0})
      expect(accepted).toBe(true)
    }
    let rest: number[] | undefined
    for (const pose of [
      {},
      {Param93: 0.25},
      {Param93: 0.5},
      {Param93: 0.75},
      {Param93: 1},
      {ParamBodyAngleX: -10},
      {ParamBodyAngleX: 10, ParamBodyAngleY: -10},
      {ParamBodyAngleZ: 10, ParamBreath: 1},
      {Param93: 1, ParamBodyAngleX: -10, ParamBodyAngleY: -10},
    ]) {
      current.setParameterValues({...values, ...pose})
      await flushPlayerInputs(current)
      const vertices = renderer.getPartVertices(id)!
      if (pose.Param93 === 1) {
        expect(Math.hypot(vertices[0]! - rest![0]!, vertices[1]! - rest![1]!)).toBeGreaterThan(1)
      }
      rest ??= [...vertices]
      const all = [...keep].flatMap((partId) => Array.from(renderer.getPartVertices(partId)!))
      const xs = all.filter((_, index) => index % 2 === 0)
      const ys = all.filter((_, index) => index % 2 === 1)
      const left = Math.min(...xs)
      const top = Math.min(...ys)
      const width = Math.max(...xs) - left
      const height = Math.max(...ys) - top
      const zoom = Math.min(360 / width, 560 / height)
      current.setViewCamera({x: left - 20 / zoom, y: top - 20 / zoom, zoom})
      await flushPlayerInputs(current)
      current.redraw()
      const sizes = components(await pixels(canvas.toDataURL()))
      expect(sizes, JSON.stringify(pose)).toHaveLength(1)
    }
    const visible = (coat: number) =>
      new Map(
        getScenePartStates(document, {...values, Param49: coat}).map((part) => [
          part.partId,
          part.visible,
        ]),
      )
    expect(visible(1).get(id)).toBe(true)
    expect(visible(0).get(id)).toBe(false)
    expect(visible(0).get('ArtMesh136')).toBe(true)
    for (const original of ['ArtMesh136', 'ArtMesh137', 'ArtMesh139']) {
      expect(visible(1).get(original), 'Original fingers and pen stay visible').toBe(true)
      expect(document.parts.find((part) => part.id === original)!.texture.src).not.toBe(
        hand!.texture.src,
      )
    }
  },
  60_000,
)

test.each([false, true])(
  'should retain the wrist contact while live head physics changes (buffering=%s)',
  async (buffering) => {
    const prepared = await preparePuppetDocument({
      source: await fetch(modelUrl).then((response) => response.blob()),
    })
    if (!prepared.ok) {
      throw new Error('Invalid Ash')
    }
    const document = prepared.document
    const contacts = (document.glue ?? []).filter(
      (glue) =>
        glue.first.partId.startsWith('coat-free:notes-left:ArtMesh90') &&
        glue.second.partId.startsWith('coat-free:notes-left:wrist-surface-') &&
        glue.mode !== 'translate' &&
        glue.strength === 1,
    )
    const translation = document.glue!.find(
      (glue) =>
        glue.mode === 'translate' && glue.first.partId === 'coat-free:notes-left:ArtMesh900',
    )!
    const elbow = document.glue!.find(
      (glue) => glue.id === 'coat-free:notes-left:elbow-center:contact',
    )!
    expect(elbow, 'The confirmed elbow contact must be present').toBeDefined()
    const wristEnds = [2, 33].map(
      (vertexIndex) =>
        contacts.find(
          (glue) =>
            glue.first.partId === 'coat-free:notes-left:ArtMesh900' &&
            glue.first.vertexIndex === vertexIndex,
        )!.second,
    )
    expect(contacts).toHaveLength(16)
    let canvas!: HTMLCanvasElement
    render(() => (
      <div class="h-150 w-100 bg-white">
        <canvas ref={canvas} aria-label="Ash wrist with head physics" class="h-full w-full" />
      </div>
    ))
    interface Snapshot {
      readonly image: string
      readonly weldError: number
      readonly elbowError: number
      readonly arm: ReadonlyArray<number>
      readonly wristAngle: number
      readonly penAngle: number
      readonly handAngle: number
      readonly notebookHandAngle: number
      readonly anchor: ReadonlyArray<number>
    }
    let pending: {resolve: (snapshot: Snapshot) => void; direction: number} | undefined
    player = await createPlayer({
      buffering,
      canvas,
      document,
      framing: 'viewport',
      onAfterRender: () => {
        if (
          pending === undefined ||
          (current.getParameterValue('Param57') ?? 0) * pending.direction < 0.4
        ) {
          return
        }
        const {resolve} = pending
        pending = undefined
        const elbowSource = renderer.getPartVertices(elbow.first.partId)!
        const elbowTarget = renderer.getPartVertices(elbow.second.partId)!
        resolve({
          anchor: Array.from(renderer.getPartVertices(translation.second.partId)!).slice(
            translation.second.vertexIndex * 2,
            translation.second.vertexIndex * 2 + 2,
          ),
          arm: Array.from(renderer.getPartVertices('coat-free:notes-left:ArtMesh900')!),
          elbowError: Math.hypot(
            elbowSource[elbow.first.vertexIndex * 2]! - elbowTarget[elbow.second.vertexIndex * 2]!,
            elbowSource[elbow.first.vertexIndex * 2 + 1]! -
              elbowTarget[elbow.second.vertexIndex * 2 + 1]!,
          ),
          handAngle: readHandAngle(),
          image: canvas.toDataURL(),
          notebookHandAngle: readNotebookHandAngle(),
          penAngle: readPenAngle(),
          weldError: readWeldError(),
          wristAngle: readWristAngle(),
        })
      },
      physicsPreview: true,
      renderer: 'pixi-webgl',
      resolution: 2,
    })
    const current = player
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results.at(-1)!.value
    const readWeldError = () =>
      Math.max(
        0,
        ...contacts.map((glue) => {
          const source = renderer.getPartVertices(glue.first.partId)!
          const target = renderer.getPartVertices(glue.second.partId)!
          return Math.hypot(
            source[glue.first.vertexIndex * 2]! - target[glue.second.vertexIndex * 2]!,
            source[glue.first.vertexIndex * 2 + 1]! - target[glue.second.vertexIndex * 2 + 1]!,
          )
        }),
      )
    const readWristAngle = () => {
      const points = wristEnds.map((end) => {
        const vertices = renderer.getPartVertices(end.partId)!
        return vertices.slice(end.vertexIndex * 2, end.vertexIndex * 2 + 2)
      })
      return Math.atan2(points[0]![1]! - points[1]![1]!, points[0]![0]! - points[1]![0]!)
    }
    const readPenAngle = () => {
      const vertices = renderer.getPartVertices('ArtMesh139')!
      return Math.atan2(vertices[3]! - vertices[1]!, vertices[2]! - vertices[0]!)
    }
    const readHandAngle = () => {
      const vertices = renderer.getPartVertices('coat-free:notes-left:hand')!
      return Math.atan2(vertices[201]! - vertices[1]!, vertices[200]! - vertices[0]!)
    }
    const readNotebookHandAngle = () => {
      const vertices = renderer.getPartVertices('ArtMesh125')!
      return Math.atan2(vertices[81]! - vertices[1]!, vertices[80]! - vertices[0]!)
    }
    const angleDelta = (angle: number, rest: number) =>
      Math.atan2(Math.sin(angle - rest), Math.cos(angle - rest))
    const range = (angles: ReadonlyArray<number>) => Math.max(...angles) - Math.min(...angles)
    const expectSimilarSway = (pen: ReadonlyArray<number>, notebook: ReadonlyArray<number>) => {
      const ratio = range(pen) / range(notebook)
      expect(range(notebook), 'The reference hand must actually move').toBeGreaterThan(
        Math.PI / 360,
      )
      expect(ratio, 'The pen hand should sway as much as the notebook hand').toBeGreaterThan(0.75)
      expect(ratio, 'The pen hand should sway as much as the notebook hand').toBeLessThan(1.25)
    }
    current.pause()
    current.setBreath(false)
    current.setEyeBlink(false)
    const expression = document.expressions!.find((candidate) => candidate.id === '노트 들기')!
    const values = {
      ...Object.fromEntries(
        document.parameters!.map((parameter) => [parameter.id, parameter.defaultValue]),
      ),
      ...Object.fromEntries(
        expression.parameters.map((parameter) => [parameter.parameterId, parameter.value]),
      ),
      Param49: 1,
    }
    current.setParameterValues(values)
    const camera = {x: 1200, y: 800, zoom: 0.28}
    current.setViewCamera(camera)
    await flushPlayerInputs(current)
    const kept = new Set([
      'coat-free:notes-left:hand',
      'ArtMesh136',
      'ArtMesh137',
      'ArtMesh139',
      'coat-free:notes-left:ArtMesh900',
      'coat-free:notes-left:ArtMesh901',
    ])
    for (const branch of hiddenBranches(document.scene!.roots, kept)) {
      if (branch.kind === 'group') {
        current.setGroupOverride(branch.id, {opacity: 0})
      } else {
        current.setPartOverride(branch.id, {opacity: 0})
      }
    }
    await flushPlayerInputs(current)
    const neutralArm = Array.from(renderer.getPartVertices('coat-free:notes-left:ArtMesh900')!)
    const neutralWrist = readWristAngle()
    const neutralPen = readPenAngle()
    const neutralHand = readHandAngle()
    const neutralNotebookHand = readNotebookHandAngle()
    const neutralAnchor = Array.from(renderer.getPartVertices(translation.second.partId)!).slice(
      translation.second.vertexIndex * 2,
      translation.second.vertexIndex * 2 + 2,
    )
    const wristVertices = new Set(
      document.glue
        ?.filter(
          (glue) =>
            glue.id.includes(':wrist-surface-') &&
            glue.first.partId === 'coat-free:notes-left:ArtMesh900',
        )
        .map((glue) => glue.first.vertexIndex),
    )
    const forearm = document.parts.find((part) => part.id === 'coat-free:notes-left:ArtMesh900')!
    const core = [...new Set(forearm.mesh.indices)].filter((index) => !wristVertices.has(index))
    const nextPhysicsFrame = (direction: number) =>
      new Promise<Snapshot>((resolve) => {
        pending = {direction, resolve}
      })
    const images: string[] = []
    const wristAngles: number[] = []
    const penAngles: number[] = []
    const handAngles: number[] = []
    const notebookHandAngles: number[] = []
    current.resume()
    for (const direction of [1, -1, 1]) {
      const rendered = nextPhysicsFrame(direction)
      current.setParameterValues({
        ...values,
        ParamAngleX: direction * 30,
        ParamAngleZ: direction * 20,
      })
      const snapshot = await rendered
      current.pause()
      const movement = [0, 1].map((axis) => snapshot.arm[36 + axis]! - neutralArm[36 + axis]!)
      expect(Math.hypot(...movement), 'The forearm body follows the moving wrist').toBeGreaterThan(
        1,
      )
      for (const axis of [0, 1]) {
        expect(
          Math.abs(movement[axis]! - (snapshot.anchor[axis]! - neutralAnchor[axis]!)),
        ).toBeLessThan(0.01)
        for (const index of core) {
          const delta =
            snapshot.arm[index * 2 + axis]! -
            snapshot.arm[36 + axis]! -
            (neutralArm[index * 2 + axis]! - neutralArm[36 + axis]!)
          expect(Math.abs(delta), 'Only translation is allowed outside the wrist').toBeLessThan(
            0.01,
          )
        }
      }
      expect(snapshot.weldError).toBeLessThan(0.01)
      expect(
        snapshot.elbowError,
        'The arm centers remain joined during head reversals',
      ).toBeLessThan(0.01)
      const wristDelta = snapshot.wristAngle - neutralWrist
      wristAngles.push(Math.abs(Math.atan2(Math.sin(wristDelta), Math.cos(wristDelta))))
      const penDelta = snapshot.penAngle - neutralPen
      penAngles.push(Math.abs(Math.atan2(Math.sin(penDelta), Math.cos(penDelta))))
      const handDelta = snapshot.handAngle - neutralHand
      handAngles.push(Math.atan2(Math.sin(handDelta), Math.cos(handDelta)))
      notebookHandAngles.push(angleDelta(snapshot.notebookHandAngle, neutralNotebookHand))
      const visible = await pixels(snapshot.image)
      expect(components(visible)).toHaveLength(1)
      images.push(snapshot.image)
      current.resume()
    }
    current.pause()
    expect(Math.max(...wristAngles), 'The wrist moves with head physics').toBeGreaterThan(
      Math.PI / 720,
    )
    expect(Math.max(...wristAngles), 'The wrist bend remains modest').toBeLessThan(Math.PI / 9)
    expect(Math.max(...penAngles), 'The painted pen moves with head physics').toBeGreaterThan(
      Math.PI / 360,
    )
    expectSimilarSway(handAngles, notebookHandAngles)
    const pinWristPhysics = (
      signal: number,
      writing: number,
      driver: 'body' | 'swayX' | 'swayY',
    ) => {
      const body = driver === 'body' ? signal : 0
      const resolved = {
        ...values,
        Param25: driver === 'swayX' ? signal : 0,
        Param28: driver === 'swayY' ? signal : 0,
        Param50: (body * 5) / 7,
        Param57: body,
        Param58: (body * 5) / 7,
        Param61: body,
        Param93: writing,
      }
      current.patchParameterBlends(
        Object.fromEntries(
          Object.entries(resolved).map(([id, value]) => [id, {mode: 'overwrite' as const, value}]),
        ),
        'after-physics',
      )
    }
    for (const writing of [0, 0.5, 1]) {
      for (const driver of ['body', 'swayX', 'swayY'] as const) {
        pinWristPhysics(0, writing, driver)
        await flushPlayerInputs(current)
        const isolatedPenVertices = Array.from(renderer.getPartVertices('ArtMesh139')!)
        const paintedPen = [
          ...new Set(document.parts.find((part) => part.id === 'ArtMesh139')!.mesh.indices),
        ]
        const isolatedHand = readHandAngle()
        const isolatedNotebookHand = readNotebookHandAngle()
        const handSweep: number[] = []
        const notebookSweep: number[] = []
        const penMotion: number[] = []
        const rest = Array.from(renderer.getPartVertices('coat-free:notes-left:ArtMesh900')!)
        for (const direction of [1, -1]) {
          pinWristPhysics(direction * 0.8, writing, driver)
          await flushPlayerInputs(current)
          const currentPen = renderer.getPartVertices('ArtMesh139')!
          penMotion.push(
            Math.max(
              ...paintedPen.map((index) =>
                Math.hypot(
                  currentPen[index * 2]! - isolatedPenVertices[index * 2]!,
                  currentPen[index * 2 + 1]! - isolatedPenVertices[index * 2 + 1]!,
                ),
              ),
            ),
          )
          handSweep.push(angleDelta(readHandAngle(), isolatedHand))
          notebookSweep.push(angleDelta(readNotebookHandAngle(), isolatedNotebookHand))
          const penHand = handSweep.at(-1)!
          const notebookHand = notebookSweep.at(-1)!
          if (Math.abs(notebookHand) > Math.PI / 360) {
            expect(
              penHand * notebookHand,
              'Both hands follow the same physics direction',
            ).toBeGreaterThan(0)
          }
          expect(readWeldError(), 'The wrist stays joined while writing with physics').toBeLessThan(
            0.01,
          )
          const arm = renderer.getPartVertices('coat-free:notes-left:ArtMesh900')!
          const coreError = Math.max(
            0,
            ...core.flatMap((index) =>
              [0, 1].map((axis) =>
                Math.abs(
                  arm[index * 2 + axis]! -
                    arm[36 + axis]! -
                    (rest[index * 2 + axis]! - rest[36 + axis]!),
                ),
              ),
            ),
          )
          expect(coreError, 'Only the wrist bends while the forearm keeps its shape').toBeLessThan(
            0.01,
          )
        }
        expectSimilarSway(handSweep, notebookSweep)
        expect(
          Math.min(...penMotion),
          'The painted pen moves in both physics directions',
        ).toBeGreaterThan(1)
      }
    }
    if (!buffering) {
      render(() => (
        <section aria-label="Live arm physics" class="flex w-225 bg-white">
          <For each={images}>
            {(src, index) => <img src={src} alt={`Head reversal ${index() + 1}`} class="w-75" />}
          </For>
        </section>
      ))
      await page.getByRole('region', {name: 'Live arm physics'}).screenshot({
        path: '__screenshots__/ash-arm-live-physics.png',
      })
    }
  },
  60_000,
)
