import {mockNativeWebview} from '../fixtures/native-webview'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {meshPoint} from '../../../../packages/puppet/src/player/internal/mesh-point'
import * as playerModule from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
import {modelTouchParameters} from '../../src/features/touch'
import {useWidget} from '../../src/features/poffo/use-widget'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

let ashDocument: playerModule.PreparedPuppetDocument | null = null
let ashBlob: Blob
let tick: (deltaTime: number) => void = () => undefined
// Asset preparation is shared; every interaction still uses the actual validated model and renderer.
vi.mock('../../src/features/background/use-puppet-document', () => ({
  usePuppetDocument: () => ({document: () => ashDocument, ready: () => ashDocument !== null}),
}))
beforeAll(async () => {
  ashBlob = await fetch(ashUrl).then((response) => response.blob())
  const prepared = await playerModule.preparePuppetDocument({source: ashBlob})
  if (!prepared.ok) {
    throw new Error('Ash fixture could not be prepared')
  }
  ashDocument = prepared.document
})
vi.mock('../../src/features/poffo/use-widget', () => ({useWidget: vi.fn()}))
vi.mock('../../src/features/poffo/use-widget-hit-test', () => ({
  useWidgetHitTest: () => ({afterRender: () => undefined}),
}))
vi.mock('@tauri-apps/api/webview', () => ({getCurrentWebview: vi.fn()}))
beforeEach(() => {
  mockNativeWebview()
})
vi.mock('@tauri-apps/api/core', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/core')>()),
  invoke: vi.fn(async () => undefined),
  isTauri: () => true,
}))
vi.mock('@tauri-apps/api/window', async (original) => ({
  ...(await original<typeof import('@tauri-apps/api/window')>()),
  getCurrentWindow: () => ({
    outerPosition: vi.fn(async () => ({x: 0, y: 0})),
    scaleFactor: vi.fn(async () => 1),
    setPosition: vi.fn(),
  }),
}))
vi.mock('@winter-love/puppet/player', async (original) => {
  const actual = await original<typeof playerModule>()
  return {...actual, createPlayer: vi.fn(actual.createPlayer)}
})
vi.mock(
  '../../../../packages/puppet/src/player/rendering/create-player-renderer',
  async (original) => {
    const actual = await original<typeof rendererModule>()
    return {
      ...actual,
      createPlayerRenderer: vi.fn(async (options) => {
        const renderer = await actual.createPlayerRenderer(options)
        // Advance the actual physics and renderer at explicit frame boundaries.
        return {
          ...renderer,
          subscribeFrame: (listener: (deltaTime: number) => void) => {
            tick = listener
          },
        }
      }),
    }
  },
)
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test.each(['tail', 'chest'] as const)(
  'should drag Ash %s and release into its authored physics',
  async (body) => {
    const ready = Promise.withResolvers<playerModule.Player>()
    const errors = vi.fn((cause: unknown) => ready.reject(cause))
    const create = vi.mocked(playerModule.createPlayer).getMockImplementation()!
    vi.mocked(playerModule.createPlayer).mockImplementationOnce(async (options) => {
      // This fixture advances exact native time steps; Worker behavior has its own input test.
      const player = await create({...options, buffering: false})
      ready.resolve(player)
      return player
    })
    const touch = builtinConnectionProfile('builtin:ash')!.connections.touch!
    vi.mocked(useWidget).mockReturnValue({
      agentBindings: () => undefined,
      assetId: () => 'builtin:ash',
      drag: vi.fn(),
      error: () => null,
      lipsync: () => undefined,
      load: async () => ashBlob,
      menuActions: () => [],
      motionId: () => null,
      report: errors,
      saveSize: vi.fn(),
      semanticBindings: () => undefined,
      toggleAction: vi.fn(),
      touch: () => touch,
      tracking: () => 'off',
      trackingBindings: () => undefined,
      trackingOptions: () => undefined,
    })
    render(() => <SPoffoWidget id="ash-body" />)
    const player = await ready.promise
    await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
    player.pause()
    player.setPhysicsPreview(false)
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results[0]!.value
    const document = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
    const parameters = modelTouchParameters(document)
    const origin = renderer.toDocumentPoint({x: 0, y: 0})
    const step = renderer.toDocumentPoint({x: 1, y: 1})
    const toCanvas = (point: {x: number; y: number}) => ({
      x: (point.x - origin.x) / (step.x - origin.x),
      y: (point.y - origin.y) / (step.y - origin.y),
    })
    let ids =
      body === 'tail'
        ? touchJointChains(touch)
            .find((chain) => chain.id === 'tail')!
            .joints.map((joint) => joint.parameterId!)
        : ['Param53', 'Param54', 'Param55', 'Param56']
    const parts =
      body === 'tail'
        ? [...parameters.find((item) => item.id === ids[0])!.parts].sort(
            (first, second) =>
              parameters.filter((item) => ids.includes(item.id) && item.parts.includes(second))
                .length -
              parameters.filter((item) => ids.includes(item.id) && item.parts.includes(first))
                .length,
          )
        : [
            'ArtMesh451',
            'ArtMesh452',
            'ArtMesh453',
            ...parameters.find((item) => item.id === 'Param53')!.parts,
          ]
    const candidates = parts.flatMap((id) => {
      const mesh = document.parts.find((part) => part.id === id)!.mesh
      const vertices = renderer.getPartVertices(id)!
      return Array.from({length: mesh.indices.length / 3}, (_, triangle) => {
        const indices = mesh.indices.slice(triangle * 3, triangle * 3 + 3)
        const point = toCanvas({
          x: indices.reduce((sum, index) => sum + vertices[index * 2]!, 0) / 3,
          y: indices.reduce((sum, index) => sum + vertices[index * 2 + 1]!, 0) / 3,
        })
        return {id, mesh, point}
      })
    })
    const selected = candidates.find(({id, point}) => player.pickPart(point) === id)
    expect(selected, body).toBeDefined()
    const {id, mesh, point} = selected!
    if (body === 'tail') {
      ids = ids.filter((key) => parameters.find((item) => item.id === key)!.parts.includes(id))
    }
    const anchor = meshPoint({
      indices: mesh.indices,
      point: renderer.toDocumentPoint(point),
      vertices: renderer.getPartVertices(id)!,
    })!
    const read = () => {
      const vertices = renderer.getPartVertices(id)!
      return toCanvas({
        x: anchor.indices.reduce(
          (sum, index, i) => sum + vertices[index * 2]! * anchor.weights[i]!,
          0,
        ),
        y: anchor.indices.reduce(
          (sum, index, i) => sum + vertices[index * 2 + 1]! * anchor.weights[i]!,
          0,
        ),
      })
    }
    let target = {x: point.x + 20, y: point.y + 15}
    if (body === 'tail') {
      player.patchParameterBlends({[ids[0]!]: {mode: 'overwrite', value: 15}}, 'interaction')
      target = read()
      player.patchParameterBlends({[ids[0]!]: undefined}, 'interaction')
    }
    const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
    vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
    const pointer = (type: string, position: {x: number; y: number}) =>
      fireEvent(
        canvas,
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          cancelable: true,
          clientX: position.x,
          clientY: position.y,
          pointerId: 1,
        }),
      )
    let identity = 0
    const frames = new Map<number, FrameRequestCallback>()
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      identity += 1
      frames.set(identity, callback)
      return identity
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((frame) => {
      frames.delete(frame)
    })
    const advance = (time: number) => {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((callback) => callback(time))
    }
    const createDrag = vi.spyOn(player, 'createParameterDrag')
    pointer('pointerdown', point)
    pointer('pointermove', target)
    advance(0)
    advance(2500)
    const held = ids.map((key) => player.getParameterValue(key)!)
    expect(Math.max(...held.map(Math.abs))).toBeGreaterThan(0.05)
    if (body === 'tail') {
      expect(createDrag.mock.calls[0]![0].parameterIds).toEqual(ids)
      expect(Math.hypot(read().x - target.x, read().y - target.y)).toBeLessThan(1)
    } else {
      expect(createDrag).not.toHaveBeenCalled()
      expect(held).toEqual([0.2, 0.2, -0.15, -0.15])
      expect(Math.hypot(read().x - point.x, read().y - point.y)).toBeGreaterThan(0.1)
    }
    player.setPhysicsPreview(true)
    const release = vi.spyOn(player, 'releaseParameterPhysics')
    pointer('pointerup', target)
    expect(new Set(release.mock.results[0]!.value)).toEqual(new Set(ids))
    ids.forEach((key, index) => expect(player.getParameterValue(key)).toBeCloseTo(held[index]!, 4))
    const history: number[][] = []
    for (let frame = 0; frame < 180; frame += 1) {
      tick(1 / 30)
      history.push(ids.map((key) => player.getParameterValue(key)!))
    }
    expect(
      history.some((values) => values.some((value, index) => value * held[index]! < -0.0001)),
    ).toBe(true)
    expect(Math.max(...history.at(-1)!.map(Math.abs))).toBeLessThan(0.05)
    expect(errors).not.toHaveBeenCalled()
  },
)
