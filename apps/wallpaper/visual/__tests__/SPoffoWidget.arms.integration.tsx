import {mockNativeWebview} from '../fixtures/native-webview'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
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

const center = (vertices: ArrayLike<number>) => {
  let x = 0
  let y = 0
  for (let index = 0; index < vertices.length; index += 2) {
    x += vertices[index]!
    y += vertices[index + 1]!
  }
  return {x: x / (vertices.length / 2), y: y / (vertices.length / 2)}
}

test.each([
  {direction: 1, index: 0},
  {direction: -1, index: 1},
])(
  'should follow XY targets, prioritize distal joints and restore arm $index',
  async ({index, direction}) => {
    const ready = Promise.withResolvers<playerModule.Player>()
    const errors = vi.fn((cause: unknown) => ready.reject(cause))
    const create = vi.mocked(playerModule.createPlayer).getMockImplementation()!
    vi.mocked(playerModule.createPlayer).mockImplementationOnce(async (options) => {
      // This rig test owns a manual frame clock; evaluate each sampled pose synchronously.
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
    render(() => <SPoffoWidget id="ash-arms" />)
    const player = await ready.promise
    await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
    player.pause()
    player.setPhysicsPreview(false)
    const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results[0]!.value
    const document = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
    const parameters = modelTouchParameters(document)
    const names = new Map<string, string>()
    const visit = (node: playerModule.PuppetSceneNode) => {
      names.set(node.id, node.name)
      if ('children' in node) {
        node.children.forEach(visit)
      }
    }
    document.scene?.roots.forEach(visit)
    const origin = renderer.toDocumentPoint({x: 0, y: 0})
    const step = renderer.toDocumentPoint({x: 1, y: 1})
    const toCanvas = (point: {readonly x: number; readonly y: number}) => ({
      x: (point.x - origin.x) / (step.x - origin.x),
      y: (point.y - origin.y) / (step.y - origin.y),
    })
    const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
    vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
    const drag = async (chain: readonly string[], other: readonly string[], direction: number) => {
      const id = chain[0]!
      const parameter = parameters.find((item) => item.id === id)!
      const candidates = parameter.parts
        .filter((part) => /Hand|Palm|Finger/u.test(names.get(part) ?? ''))
        .map((part) => ({part, point: toCanvas(center(renderer.getPartVertices(part)!))}))
      const hand = candidates.find(
        (candidate) => player.pickPart(candidate.point) === candidate.part,
      )
      expect(hand, JSON.stringify(candidates)).toBeDefined()
      const selected = hand!
      const mesh = document.parts.find((part) => part.id === selected.part)!.mesh
      const anchor = meshPoint({
        indices: mesh.indices,
        point: renderer.toDocumentPoint(selected.point),
        vertices: renderer.getPartVertices(selected.part)!,
      })!
      const readHand = () => {
        const vertices = renderer.getPartVertices(selected.part)!
        const x = anchor.indices.reduce(
          (sum, index, i) => sum + vertices[index * 2]! * anchor.weights[i]!,
          0,
        )
        const y = anchor.indices.reduce(
          (sum, index, i) => sum + vertices[index * 2 + 1]! * anchor.weights[i]!,
          0,
        )
        const first = anchor.indices[0] * 2
        const second = anchor.indices[1] * 2
        return {
          ...toCanvas({x, y}),
          angle: Math.atan2(
            vertices[second + 1]! - vertices[first + 1]!,
            vertices[second]! - vertices[first]!,
          ),
        }
      }
      const before = readHand()
      // Derive independently reachable targets from the authored rig, before invoking IK.
      const targets = [
        [20, -30, 10],
        [-10, 15, -5],
      ].map((pose) => {
        player.patchParameterBlends(
          Object.fromEntries(
            chain.map((key, index) => [key, {mode: 'overwrite', value: pose[index]! * direction}]),
          ),
          'interaction',
        )
        return readHand()
      })
      player.patchParameterBlends(
        Object.fromEntries(chain.map((key) => [key, undefined])),
        'interaction',
      )
      const pointer = (type: string, point: {x: number; y: number}) =>
        fireEvent(
          canvas,
          new PointerEvent(type, {
            bubbles: true,
            button: 0,
            cancelable: true,
            clientX: point.x,
            clientY: point.y,
            pointerId: 1,
            screenX: point.x,
            screenY: point.y,
          }),
        )
      let clock = 0
      let identity = 0
      const frames = new Map<number, FrameRequestCallback>()
      const request = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          identity += 1
          frames.set(identity, callback)
          return identity
        })
      const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((frame) => {
        frames.delete(frame)
      })
      const advance = (elapsed: number) => {
        clock += elapsed
        const callbacks = [...frames.values()]
        frames.clear()
        callbacks.forEach((callback) => callback(clock))
      }
      const createDrag = vi.spyOn(player, 'createParameterDrag')
      pointer('pointerdown', selected.point)
      expect(createDrag).toHaveBeenCalledOnce()
      expect(createDrag.mock.results[0]!.value).toBeDefined()
      const solve = vi.spyOn(createDrag.mock.results[0]!.value!, 'solve')
      const moveToTarget = (target: (typeof targets)[number]) => {
        expect(Math.abs(target.x - before.x)).toBeGreaterThan(0.1)
        expect(Math.abs(target.y - before.y)).toBeGreaterThan(0.1)
        const previous = chain.map((key) => player.getParameterValue(key)!)
        pointer('pointermove', target)
        const desired = solve.mock.results.at(-1)!.value
        const reaction = chain.map((key, index) =>
          Math.abs(
            (player.getParameterValue(key)! - previous[index]!) /
              (desired[key]! - previous[index]!),
          ),
        )
        expect(reaction[2]).toBeGreaterThan(reaction[1]!)
        expect(reaction[1]).toBeGreaterThan(reaction[0]!)
        advance(0)
        advance(2500)
        expect(
          Math.max(...chain.map((key) => Math.abs(player.getParameterValue(key)! - desired[key]!))),
        ).toBeLessThan(0.0001)
        const after = readHand()
        expect(
          Math.hypot(after.x - target.x, after.y - target.y),
          JSON.stringify({
            after,
            chain,
            part: selected.part,
            target,
            values: chain.map((key) => player.getParameterValue(key)),
          }),
        ).toBeLessThan(1)
        expect(
          Math.atan2(Math.sin(after.angle - before.angle), Math.cos(after.angle - before.angle)),
        ).toBeCloseTo(0, 1)
        expect(player.getParameterValue(chain[0])).not.toBe(0)
        expect(player.getParameterValue(chain[1])).not.toBe(0)
        other.forEach((key) => expect(player.getParameterValue(key)).toBe(0))
      }
      moveToTarget(targets[0]!)
      moveToTarget(targets[1]!)
      request.mockRestore()
      cancel.mockRestore()
      await page
        .getByRole('main', {name: 'Poffo 위젯'})
        .screenshot({path: `__screenshots__/arm-drag-${id}.png`})
      const unreachable = {x: before.x + 2000, y: before.y - 2000}
      pointer('pointermove', unreachable)
      await expect
        .poll(() => Math.max(...chain.map((key) => Math.abs(player.getParameterValue(key)!))))
        .toBeGreaterThan(29)
      chain.forEach((key) => {
        expect(player.getParameterValue(key)).toBeGreaterThanOrEqual(-30)
        expect(player.getParameterValue(key)).toBeLessThanOrEqual(30)
      })
      expect(Math.hypot(readHand().x - before.x, readHand().y - before.y)).toBeLessThan(300)
      const held = chain.map((key) => player.getParameterValue(key)!)
      player.setPhysicsPreview(true)
      const release = vi.spyOn(player, 'releaseParameterPhysics')
      pointer('pointerup', unreachable)
      expect(new Set(release.mock.results[0]!.value)).toEqual(new Set(chain))
      chain.forEach((key, index) =>
        expect(player.getParameterValue(key)).toBeCloseTo(held[index]!, 4),
      )
      const history: number[][] = []
      for (let frame = 0; frame < 300; frame += 1) {
        tick(1 / 30)
        history.push(chain.map((key) => player.getParameterValue(key)!))
      }
      expect(
        history.some((values) => values.some((value, index) => value * held[index]! < -0.01)),
      ).toBe(true)
      expect(Math.max(...history.at(-1)!.map(Math.abs))).toBeLessThan(0.05)
      // Reset inertia only after proving the authored simulation has returned to rest.
      player.resetPhysics()
      const restored = readHand()
      expect(restored.x).toBeCloseTo(before.x)
      expect(restored.y).toBeCloseTo(before.y)
      createDrag.mockRestore()
      solve.mockRestore()
    }
    const chains = touchJointChains(touch).map((chain) =>
      chain.joints.map((joint) => joint.parameterId!),
    )
    await drag(chains[index]!, chains[1 - index]!, direction)
    expect(errors).not.toHaveBeenCalled()
  },
)
