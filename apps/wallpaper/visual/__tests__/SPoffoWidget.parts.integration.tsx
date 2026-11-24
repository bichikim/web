import {mockNativeWebview} from '../fixtures/native-webview'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest'
import {meshPoint} from '../../../../packages/puppet/src/player/internal/mesh-point'
import * as playerModule from '@winter-love/puppet/player'
import * as rendererModule from '../../../../packages/puppet/src/player/rendering/create-player-renderer'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
import {modelTouchParameters} from '../../src/features/touch'
import {useWidget} from '../../src/features/poffo/use-widget'
import {SPoffoWidget} from '../../src/components/SPoffoWidget'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import {page} from 'vitest/browser'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
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
        // Keep physics stationary while checking direct parameter gestures.
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

const mountWidget = async () => {
  const ready = Promise.withResolvers<playerModule.Player>()
  const errors = vi.fn((cause: unknown) => ready.reject(cause))
  const create = vi.mocked(playerModule.createPlayer).getMockImplementation()!
  vi.mocked(playerModule.createPlayer).mockImplementationOnce(async (options) => {
    // This rig test owns a manual frame clock; evaluate each sampled pose synchronously.
    const player = await create({...options, buffering: false})
    ready.resolve(player)
    return player
  })
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
    touch: () => builtinConnectionProfile('builtin:ash')!.connections.touch,
    tracking: () => 'off',
    trackingBindings: () => undefined,
    trackingOptions: () => undefined,
  })
  render(() => <SPoffoWidget id="ash-head" />)
  const player = await ready.promise
  await vi.mocked(playerModule.createPlayer).mock.results[0]!.value
  player.pause()
  player.setBreath(false)
  player.setPhysicsPreview(false)
  const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results[0]!.value
  const document = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
  return {document, errors, player, renderer}
}

const cases = [
  {
    chain: 'touch:right-leg',
    name: 'right-leg',
    parts: ['ArtMesh437', 'ArtMesh438', 'ArtMesh439', 'ArtMesh440'],
    pose: [3, -10, 7],
  },
  {
    chain: 'touch:left-leg',
    name: 'left-leg',
    parts: ['ArtMesh445', 'ArtMesh446', 'ArtMesh447', 'ArtMesh448'],
    pose: [-3, 10, -7],
  },
  {
    ids: ['Param41', 'Param42'],
    name: 'left-ear',
    parts: [
      'ArtMesh196',
      'ArtMesh197',
      'ArtMesh198',
      'ArtMesh199',
      'ArtMesh635',
      'ArtMesh636',
      'ArtMesh637',
      'ArtMesh191',
    ],
  },
  {
    ids: ['Param43', 'Param44'],
    name: 'right-ear',
    parts: ['ArtMesh192', 'ArtMesh193', 'ArtMesh194', 'ArtMesh195'],
  },
  {
    ids: [
      'TouchHairFrontLeft19',
      'TouchHairFrontLeft20',
      'TouchHairFrontLeft21',
      'TouchHairFrontLeft28',
      'TouchHairFrontLeft29',
      'TouchHairFrontLeft30',
    ],
    name: 'front-left',
    parts: [
      'ArtMesh163',
      'ArtMesh164',
      'ArtMesh165',
      'ArtMesh166',
      'ArtMesh167',
      'ArtMesh169',
      'ArtMesh170',
    ],
    pose: [8],
  },
  {
    ids: [
      'TouchHairFrontRight22',
      'TouchHairFrontRight24',
      'TouchHairFrontRight23',
      'TouchHairFrontRight28',
      'TouchHairFrontRight29',
      'TouchHairFrontRight30',
    ],
    name: 'front-right',
    parts: ['ArtMesh171', 'ArtMesh172', 'ArtMesh173', 'ArtMesh174', 'ArtMesh176', 'ArtMesh177'],
    pose: [-8],
  },
  {
    ids: [
      'TouchHairFrontCenter25',
      'TouchHairFrontCenter26',
      'TouchHairFrontCenter27',
      'TouchHairFrontCenter28',
      'TouchHairFrontCenter29',
      'TouchHairFrontCenter30',
    ],
    name: 'front-center',
    parts: ['ArtMesh178', 'ArtMesh0', 'ArtMesh1', 'ArtMesh179', 'ArtMesh180', 'ArtMesh181'],
    pose: [8],
  },
  {
    ids: [
      'TouchHairSideLeft19',
      'TouchHairSideLeft20',
      'TouchHairSideLeft21',
      'TouchHairSideLeft28',
      'TouchHairSideLeft29',
      'TouchHairSideLeft30',
    ],
    name: 'side-left',
    parts: ['ArtMesh214', 'ArtMesh215', 'ArtMesh216'],
    pose: [14, 0],
  },
  {
    ids: [
      'TouchHairSideRight22',
      'TouchHairSideRight24',
      'TouchHairSideRight23',
      'TouchHairSideRight28',
      'TouchHairSideRight29',
      'TouchHairSideRight30',
    ],
    name: 'side-right',
    parts: ['ArtMesh217', 'ArtMesh218', 'ArtMesh219'],
    pose: [-14, 0],
  },
  {chain: 'touch:ponytail-left', name: 'ponytail-left', pose: [15, -10, 15, -10, 15]},
  {chain: 'touch:ponytail-right', name: 'ponytail-right', pose: [-15, 10, -15, 10, -15]},
  {
    chain: 'touch:bag',
    name: 'bag',
    parts: [
      'ArtMesh300',
      'ArtMesh301',
      'ArtMesh302',
      'ArtMesh303',
      'ArtMesh304',
      'ArtMesh305',
      'ArtMesh306',
      'ArtMesh307',
    ],
    pose: [6],
  },
]

test.each(['Right', 'Left'])(
  'should fix only the %s thigh root and bend both knee surfaces together',
  async (side) => {
    const {player, renderer} = await mountWidget()
    player.setParameterValue('Param49', 1)
    const parts =
      side === 'Right'
        ? ['ArtMesh435', 'ArtMesh441', 'ArtMesh437']
        : ['ArtMesh443', 'ArtMesh449', 'ArtMesh445']
    const lengths = () =>
      parts.map((id) => {
        const vertices = renderer.getPartVertices(id)!
        return Math.max(
          ...Array.from({length: vertices.length / 2}, (_, index) =>
            Math.hypot(
              vertices[index * 2]! - vertices[0]!,
              vertices[index * 2 + 1]! - vertices[1]!,
            ),
          ),
        )
      })
    const before = lengths()
    const document = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
    const surfaces = parts.slice(0, 2).map((id) => ({
      id,
      indices: document.parts.find((part) => part.id === id)!.mesh.indices,
      vertices: [...renderer.getPartVertices(id)!],
    }))
    expect(
      Math.max(...surfaces[0]!.vertices.filter((_, index) => index % 2 === 1)),
    ).toBeGreaterThan(3900)
    expect(Math.min(...surfaces[1]!.vertices.filter((_, index) => index % 2 === 1))).toBeLessThan(
      3800,
    )
    const overlaps = [3790, 3830, 3870, 3910, 3950].flatMap((y) =>
      [50, 125, 200, 275].flatMap((offset) => {
        const x = (side === 'Right' ? 2400 : 2000) + offset
        const anchors = surfaces.map((surface) => meshPoint({point: {x, y}, ...surface}))
        return anchors.every((anchor) => anchor !== undefined) ? [anchors] : []
      }),
    )
    expect(overlaps.length).toBeGreaterThan(8)
    const thigh = [...renderer.getPartVertices(parts[0]!)!]
    const anchors = Array.from({length: thigh.length / 2}, (_, index) => index).filter(
      (index) => thigh[index * 2 + 1]! < 2520,
    )
    expect(anchors.length).toBeGreaterThanOrEqual(2)
    const direction = side === 'Right' ? 1 : -1
    player.patchParameterBlends(
      {[`Touch${side}Hip`]: {mode: 'overwrite', value: 3 * direction}},
      'interaction',
    )
    const hip = {x: side === 'Right' ? 2615 : 2190, y: 3040}
    const angle = (direction * 3 * Math.PI) / 180
    const rigid = (index: number) => ({
      x:
        hip.x +
        (thigh[index * 2]! - hip.x) * Math.cos(angle) -
        (thigh[index * 2 + 1]! - hip.y) * Math.sin(angle),
      y:
        hip.y +
        (thigh[index * 2]! - hip.x) * Math.sin(angle) +
        (thigh[index * 2 + 1]! - hip.y) * Math.cos(angle),
    })
    const attached = renderer.getPartVertices(parts[0]!)!
    anchors.forEach((index) => {
      const expected = rigid(index)
      const ratio =
        Math.hypot(
          attached[index * 2]! - thigh[index * 2]!,
          attached[index * 2 + 1]! - thigh[index * 2 + 1]!,
        ) / Math.hypot(expected.x - thigh[index * 2]!, expected.y - thigh[index * 2 + 1]!)
      expect(ratio).toBeLessThan(0.005)
    })
    const shaft = Array.from({length: thigh.length / 2}, (_, index) => index).filter(
      (index) => thigh[index * 2 + 1]! >= 3000 && thigh[index * 2 + 1]! < 3650,
    )
    expect(shaft.length).toBeGreaterThan(4)
    shaft.forEach((index) =>
      expect(
        Math.hypot(
          attached[index * 2]! - rigid(index).x,
          attached[index * 2 + 1]! - rigid(index).y,
        ),
      ).toBeLessThan(1),
    )
    player.patchParameterBlends(
      {
        [`Touch${side}Hip`]: {mode: 'overwrite', value: 40 * direction},
        [`Touch${side}Knee`]: {mode: 'overwrite', value: -110 * direction},
        [`Touch${side}Ankle`]: {mode: 'overwrite', value: 65 * direction},
      },
      'interaction',
    )
    expect(Math.abs(player.getParameterValue(`Touch${side}Hip`)!)).toBeLessThanOrEqual(3)
    expect(Math.abs(player.getParameterValue(`Touch${side}Knee`)!)).toBeLessThanOrEqual(12)
    expect(Math.abs(player.getParameterValue(`Touch${side}Ankle`)!)).toBeLessThanOrEqual(8)
    lengths().forEach((length, index) =>
      expect(Math.abs(length / before[index]! - 1)).toBeLessThan(0.02),
    )
    await page
      .getByRole('main', {name: 'Poffo 위젯'})
      .screenshot({path: `__screenshots__/ash-knee-limit-${side}.png`})
    player.setViewCamera({x: 1650, y: 3280, zoom: 0.6})
    await page
      .getByRole('main', {name: 'Poffo 위젯'})
      .screenshot({path: `__screenshots__/ash-knee-close-${side}.png`})
    overlaps.forEach((anchors) => {
      const points = anchors.map((anchor, index) => {
        const vertices = renderer.getPartVertices(surfaces[index]!.id)!
        return anchor!.indices.reduce(
          (point, vertex, slot) => ({
            x: point.x + vertices[vertex * 2]! * anchor!.weights[slot]!,
            y: point.y + vertices[vertex * 2 + 1]! * anchor!.weights[slot]!,
          }),
          {x: 0, y: 0},
        )
      })
      expect(Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)).toBeLessThan(1)
    })
  },
)

test.each(cases)(
  'should tap and drag Ash $name, preserve attachment and release into rest',
  async (entry) => {
    const {document, errors, player, renderer} = await mountWidget()
    if (entry.name === 'bag' || entry.name.endsWith('-leg')) {
      player.setParameterValue('Param49', 1)
    }
    const settings = builtinConnectionProfile('builtin:ash')!.connections.touch!
    const connection = touchJointChains(settings).find((chain) => chain.id === entry.chain)
    const ids = entry.ids ?? connection?.joints.map((joint) => joint.parameterId!)
    expect(ids, entry.name).toBeDefined()
    ids!.forEach((id) =>
      expect(
        document.parameters!.some((parameter) => parameter.id === id),
        id,
      ).toBe(true),
    )
    const catalog = modelTouchParameters(document)
    const origin = renderer.toDocumentPoint({x: 0, y: 0})
    const pixel = renderer.toDocumentPoint({x: 1, y: 1})
    const toCanvas = (point: {x: number; y: number}) => ({
      x: (point.x - origin.x) / (pixel.x - origin.x),
      y: (point.y - origin.y) / (pixel.y - origin.y),
    })
    const parts =
      entry.name === 'bag'
        ? catalog.find((parameter) => parameter.id === 'TouchBagStrap')!.parts
        : (entry.parts ?? catalog.find((parameter) => parameter.id === ids!.at(-1))!.parts)
    const candidates = parts.flatMap((id) => {
      const mesh = document.parts.find((part) => part.id === id)!.mesh
      const vertices = renderer.getPartVertices(id)!
      return Array.from({length: mesh.indices.length / 3}, (_, triangle) => {
        const indices = mesh.indices.slice(triangle * 3, triangle * 3 + 3)
        return {
          id,
          mesh,
          point: toCanvas({
            x: indices.reduce((sum, index) => sum + vertices[index * 2]!, 0) / 3,
            y: indices.reduce((sum, index) => sum + vertices[index * 2 + 1]!, 0) / 3,
          }),
        }
      })
    })
    const ordered = entry.name.startsWith('side-')
      ? candidates.toSorted((first, second) => second.point.y - first.point.y)
      : candidates
    const selected = ordered.find(
      ({id, point}) =>
        (entry.name !== 'bag' || (point.x > 470 && point.y > 245 && point.y < 315)) &&
        (!entry.name.startsWith('side-') || point.y > toCanvas({x: 0, y: 1050}).y) &&
        player.pickPart(point) === id,
    )
    expect(selected, entry.name).toBeDefined()
    const {id, mesh, point} = selected!
    const anchor = meshPoint({
      indices: mesh.indices,
      point: renderer.toDocumentPoint(point),
      vertices: renderer.getPartVertices(id)!,
    })!
    const read = () => {
      const vertices = renderer.getPartVertices(id)!
      return toCanvas(
        anchor.indices.reduce(
          (point, index, i) => ({
            x: point.x + vertices[index * 2]! * anchor.weights[i]!,
            y: point.y + vertices[index * 2 + 1]! * anchor.weights[i]!,
          }),
          {x: 0, y: 0},
        ),
      )
    }
    const before = read()
    const restVertices = [...renderer.getPartVertices(id)!]
    const materialLength = () => {
      const vertices = renderer.getPartVertices(id)!
      return Math.hypot(vertices[0]! - vertices[2]!, vertices[1]! - vertices[3]!)
    }
    const length = materialLength()
    let target = {x: point.x + 30, y: point.y + 15}
    if (connection !== undefined) {
      player.patchParameterBlends(
        Object.fromEntries(
          ids!.map((id, index) => [id, {mode: 'overwrite', value: entry.pose![index]!}]),
        ),
        'interaction',
      )
      target = read()
      player.patchParameterBlends(
        Object.fromEntries(ids!.map((id) => [id, undefined])),
        'interaction',
      )
    }
    expect(Math.hypot(target.x - before.x, target.y - before.y)).toBeGreaterThan(4)
    const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
    vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
    let time = 0
    let identity = 0
    const frames = new Map<number, FrameRequestCallback>()
    const request = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      identity += 1
      frames.set(identity, callback)
      return identity
    })
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((frame) => {
      frames.delete(frame)
    })
    const advance = (duration: number) => {
      time += duration
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((callback) => callback(time))
    }
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
    pointer('pointerdown', point)
    pointer('pointermove', target)
    advance(0)
    advance(2500)
    expect(Math.max(...ids!.map((id) => Math.abs(player.getParameterValue(id)!)))).toBeGreaterThan(
      0.01,
    )
    if (connection !== undefined) {
      expect(Math.hypot(read().x - target.x, read().y - target.y)).toBeLessThan(1)
      if (entry.name.endsWith('-leg')) {
        expect(Math.abs(player.getParameterValue(ids![1]!)!)).toBeGreaterThan(2)
        expect(materialLength()).toBeCloseTo(length, 2)
      }
    }
    if (entry.name.startsWith('ponytail-')) {
      expect(['Param25', 'Param26', 'Param27'].map((id) => player.getParameterValue(id))).toEqual([
        0, 0, 0,
      ])
    }
    expect(
      ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ'].map((id) => player.getParameterValue(id)),
    ).toEqual([0, 0, 0])
    request.mockRestore()
    cancel.mockRestore()
    await page
      .getByRole('main', {name: 'Poffo 위젯'})
      .screenshot({path: `__screenshots__/ash-touch-${entry.name}.png`})
    // Keep explicit frame control for the release and tap phases.
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      identity += 1
      frames.set(identity, callback)
      return identity
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((frame) => {
      frames.delete(frame)
    })
    player.setPhysicsPreview(true)
    pointer('pointerup', target)
    advance(0)
    advance(450)
    for (let frame = 0; frame < 180; frame += 1) {
      tick(1 / 30)
    }
    expect(Math.max(...ids!.map((id) => Math.abs(player.getParameterValue(id)!)))).toBeLessThan(
      0.02,
    )
    player.setPhysicsPreview(false)
    expect(read().x).toBeCloseTo(before.x, 1)
    expect(read().y).toBeCloseTo(before.y, 1)
    vi.spyOn(Math, 'random').mockReturnValue(0.75)
    pointer('pointerdown', point)
    pointer('pointerup', point)
    advance(0)
    advance(225)
    expect(Math.max(...ids!.map((id) => Math.abs(player.getParameterValue(id)!)))).toBeGreaterThan(
      0.001,
    )
    advance(225)
    expect(ids!.map((id) => Math.abs(player.getParameterValue(id)!))).toEqual(ids!.map(() => 0))
    expect([...renderer.getPartVertices(id)!]).toEqual(restVertices)
    expect(errors).not.toHaveBeenCalled()
  },
)

test('should keep the rear bag strap on the shoulder while its lower end follows the bag', async () => {
  const {player, renderer} = await mountWidget()
  player.setParameterValue('Param49', 1)
  const ids = ['ArtMesh493', 'ArtMesh730']
  const before = ids.map((id) => [...renderer.getPartVertices(id)!])
  const shirt = [...renderer.getPartVertices('ArtMesh413')!]
  player.patchParameterBlends({TouchBagStrap: {mode: 'overwrite', value: -14}}, 'interaction')
  ids.forEach((id, part) => {
    const rest = before[part]!
    const next = renderer.getPartVertices(id)!
    const ys = rest.filter((_, index) => index % 2 === 1)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    const roots = ys.flatMap((y, index) => (y < top + 30 ? [index] : []))
    const tips = ys.flatMap((y, index) => (y > bottom - 30 ? [index] : []))
    expect(roots.length).toBeGreaterThan(0)
    expect(tips.length).toBeGreaterThan(0)
    roots.forEach((index) =>
      expect(
        Math.hypot(
          next[index * 2]! - rest[index * 2]!,
          next[index * 2 + 1]! - rest[index * 2 + 1]!,
        ),
      ).toBeLessThan(0.05),
    )
    tips.forEach((index) =>
      expect(
        Math.hypot(
          next[index * 2]! - rest[index * 2]!,
          next[index * 2 + 1]! - rest[index * 2 + 1]!,
        ),
      ).toBeGreaterThan(1),
    )
  })
  expect([...renderer.getPartVertices('ArtMesh413')!]).toEqual(shirt)
  await page
    .getByRole('main', {name: 'Poffo 위젯'})
    .screenshot({path: '__screenshots__/ash-bag-rear-strap.png'})
})

test.each([
  {
    name: 'center bangs',
    parts: [
      'ArtMesh178',
      'ArtMesh0',
      'ArtMesh1',
      'ArtMesh179',
      'ArtMesh180',
      'ArtMesh181',
      'ArtMesh182',
      'ArtMesh183',
      'ArtMesh184',
    ],
    x: ['TouchHairFrontCenter25', 'TouchHairFrontCenter26', 'TouchHairFrontCenter27'],
    y: ['TouchHairFrontCenter28', 'TouchHairFrontCenter29', 'TouchHairFrontCenter30'],
  },
  {
    name: 'left face-framing hair',
    parts: [
      'ArtMesh163',
      'ArtMesh164',
      'ArtMesh165',
      'ArtMesh166',
      'ArtMesh167',
      'ArtMesh169',
      'ArtMesh170',
    ],
    x: ['TouchHairFrontLeft19', 'TouchHairFrontLeft20', 'TouchHairFrontLeft21'],
    y: ['TouchHairFrontLeft28', 'TouchHairFrontLeft29', 'TouchHairFrontLeft30'],
  },
  {
    name: 'right face-framing hair',
    parts: ['ArtMesh171', 'ArtMesh172', 'ArtMesh173', 'ArtMesh174', 'ArtMesh176', 'ArtMesh177'],
    x: ['TouchHairFrontRight22', 'TouchHairFrontRight24', 'TouchHairFrontRight23'],
    y: ['TouchHairFrontRight28', 'TouchHairFrontRight29', 'TouchHairFrontRight30'],
  },
  {
    name: 'left side hair',
    parts: ['ArtMesh214', 'ArtMesh215', 'ArtMesh216'],
    x: ['TouchHairSideLeft19', 'TouchHairSideLeft20', 'TouchHairSideLeft21'],
    y: ['TouchHairSideLeft28', 'TouchHairSideLeft29', 'TouchHairSideLeft30'],
  },
  {
    name: 'right side hair',
    parts: ['ArtMesh217', 'ArtMesh218', 'ArtMesh219'],
    x: ['TouchHairSideRight22', 'TouchHairSideRight24', 'TouchHairSideRight23'],
    y: ['TouchHairSideRight28', 'TouchHairSideRight29', 'TouchHairSideRight30'],
  },
])('should drag visible $name only within its authored physics range', async (entry) => {
  const {player, renderer, document} = await mountWidget()
  const origin = renderer.toDocumentPoint({x: 0, y: 0})
  const pixel = renderer.toDocumentPoint({x: 1, y: 1})
  const toCanvas = (point: {x: number; y: number}) => ({
    x: (point.x - origin.x) / (pixel.x - origin.x),
    y: (point.y - origin.y) / (pixel.y - origin.y),
  })
  const candidates = entry.parts
    .flatMap((id) => {
      const mesh = document.parts.find((part) => part.id === id)!.mesh
      const vertices = renderer.getPartVertices(id)!
      return Array.from({length: mesh.indices.length / 3}, (_, triangle) => {
        const indices = mesh.indices.slice(triangle * 3, triangle * 3 + 3)
        return {
          id,
          point: toCanvas({
            x: indices.reduce((sum, index) => sum + vertices[index * 2]!, 0) / 3,
            y: indices.reduce((sum, index) => sum + vertices[index * 2 + 1]!, 0) / 3,
          }),
        }
      })
    })
    .toSorted((first, second) => second.point.y - first.point.y)
  const selected = candidates.find(({id, point}) => player.pickPart(point) === id)
  expect(selected).toBeDefined()
  const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
  vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
  const pointer = (type: string, point: {x: number; y: number}) =>
    fireEvent(
      canvas,
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX: point.x,
        clientY: point.y,
        pointerId: 1,
      }),
    )
  const region = {
    'center bangs': ['Part35'],
    'left face-framing hair': ['Part33', 'Part36'],
    'left side hair': ['ArtMesh214', 'ArtMesh215', 'ArtMesh216'],
    'right face-framing hair': ['Part31', 'Part34', 'Part37'],
    'right side hair': ['ArtMesh217', 'ArtMesh218', 'ArtMesh219'],
  }[entry.name]!
  const descendants = (
    node: playerModule.PuppetSceneNode,
    selected: ReadonlySet<string>,
    active = false,
  ): string[] => {
    const included = active || selected.has(node.id)
    return node.kind === 'part'
      ? included
        ? [node.id]
        : []
      : node.children.flatMap((child) => descendants(child, selected, included))
  }
  const allowed = new Set(
    document.scene!.roots.flatMap((node) => descendants(node, new Set(region))),
  )
  const hair = new Set(['Part31', 'Part32', 'Part39', 'Part40', 'Part41', 'Part89'])
  const untouched = document
    .scene!.roots.flatMap((node) => descendants(node, hair))
    .filter((id) => !allowed.has(id))
    .map((id) => ({id, vertices: [...renderer.getPartVertices(id)!]}))
  pointer('pointerdown', selected!.point)
  const yIds = entry.y
  const check = (direction: number) => {
    untouched.forEach(({id, vertices}) =>
      expect([...renderer.getPartVertices(id)!], `${entry.name} moved ${id}`).toEqual(vertices),
    )
    entry.x.forEach((id) => expect(player.getParameterValue(id)).toBe(direction))
    Array.from({length: 12}, (_, index) => `Param${19 + index}`).forEach((id) =>
      expect(player.getParameterValue(id)).toBe(0),
    )
    yIds.forEach((id) => expect(player.getParameterValue(id)).toBe(-direction))
    ;[
      'TouchFrontCenter',
      'TouchFrontLeft',
      'TouchFrontRight',
      'TouchSideLeft',
      'TouchSideLeftY',
      'TouchSideRight',
      'TouchSideRightY',
    ].forEach((id) => expect(player.getParameterValue(id)).toBe(0))
    ;['ParamAngleX', 'ParamAngleY', 'ParamAngleZ'].forEach((id) =>
      expect(player.getParameterValue(id)).toBe(0),
    )
    ;[...entry.x, ...yIds].forEach((id) =>
      expect(document.parameters!.find((parameter) => parameter.id === id)).toMatchObject({
        maximum: 1,
        minimum: -1,
      }),
    )
  }
  pointer('pointermove', {x: selected!.point.x + 10000, y: selected!.point.y + 10000})
  check(1)
  pointer('pointermove', {x: selected!.point.x - 10000, y: selected!.point.y - 10000})
  check(-1)
  player.setViewCamera({x: 1650, y: 100, zoom: 0.6})
  await page
    .getByRole('main', {name: 'Poffo 위젯'})
    .screenshot({path: `__screenshots__/ash-physics-${entry.name.replaceAll(' ', '-')}.png`})
  player.setPhysicsPreview(true)
  pointer('pointerup', {x: selected!.point.x - 10000, y: selected!.point.y - 10000})
  for (let frame = 0; frame < 180; frame += 1) {
    tick(1 / 30)
    untouched.forEach(({id, vertices}) =>
      expect([...renderer.getPartVertices(id)!], `releasing ${entry.name} moved ${id}`).toEqual(
        vertices,
      ),
    )
  }
  expect(
    Math.max(...[...entry.x, ...entry.y].map((id) => Math.abs(player.getParameterValue(id)!))),
  ).toBeLessThan(0.02)
})

test('should join the hip bag to a rear waist strap through torso turns', async () => {
  const {player, document, renderer, errors} = await mountWidget()
  player.setParameterValue('Param49', 1)
  player.setParameterValue('Param51', 1)
  player.setViewCamera({x: 1750, y: 1900, zoom: 0.65})
  const id = 'waist-pouch-rear-strap'
  const strap = document.parts.find((part) => part.id === id)
  expect(strap).toBeDefined()
  expect(strap!.texture).toMatchObject({height: 724, width: 2172})
  const artwork = await fetch(strap!.texture.src!).then((response) => response.arrayBuffer())
  const digest = await crypto.subtle.digest('SHA-256', artwork)
  expect(
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  ).toBe('1f1c1e80a26ed73b0ede70301290c7df209bba25d5b7e28eb9cf15349a26f2db')
  const vertexAt = (x: number, y: number) => {
    const distances = strap!.mesh.uvs.flatMap((u, index) =>
      index % 2 === 0 ? [Math.hypot(u * 2172 - x, strap!.mesh.uvs[index + 1]! * 724 - y)] : [],
    )
    const index = distances.indexOf(Math.min(...distances))
    const vertices = renderer.getPartVertices(id)!
    return {x: vertices[index * 2]!, y: vertices[index * 2 + 1]!}
  }
  const pouch = document.parts.find((part) => part.id === 'ArtMesh321')!
  const attachment = meshPoint({
    indices: pouch.mesh.indices,
    point: vertexAt(1888, 365),
    vertices: renderer.getPartVertices(pouch.id)!,
  })!
  expect(attachment).toBeDefined()
  const waistAnchor = vertexAt(240, 365)
  const origin = renderer.toDocumentPoint({x: 0, y: 0})
  const pixel = renderer.toDocumentPoint({x: 1, y: 1})
  const toCanvas = (point: {x: number; y: number}) => ({
    x: (point.x - origin.x) / (pixel.x - origin.x),
    y: (point.y - origin.y) / (pixel.y - origin.y),
  })
  const visible = () => {
    const vertices = renderer.getPartVertices(id)!
    return Array.from({length: strap!.mesh.indices.length / 3}, (_, triangle) => {
      const indices = strap!.mesh.indices.slice(triangle * 3, triangle * 3 + 3)
      return toCanvas({
        x: indices.reduce((sum, index) => sum + vertices[index * 2]!, 0) / 3,
        y: indices.reduce((sum, index) => sum + vertices[index * 2 + 1]!, 0) / 3,
      })
    }).filter((point) => player.pickPart(point) === id)
  }
  const cap = (end: 'root' | 'bag') => {
    const uvs = strap!.mesh.uvs.filter((_, index) => index % 2 === 0)
    const minimum = Math.min(...uvs)
    const maximum = Math.max(...uvs)
    const vertices = renderer.getPartVertices(id)!
    const indices = uvs.flatMap((u, index) =>
      (
        end === 'root'
          ? u < minimum + (maximum - minimum) * 0.08
          : u > maximum - (maximum - minimum) * 0.08
      )
        ? [index]
        : [],
    )
    expect(indices.length).toBeGreaterThan(0)
    return toCanvas({
      x: indices.reduce((sum, index) => sum + vertices[index * 2]!, 0) / indices.length,
      y: indices.reduce((sum, index) => sum + vertices[index * 2 + 1]!, 0) / indices.length,
    })
  }
  const order = renderer.getPaintOrder()
  expect(order.indexOf(id)).toBeGreaterThanOrEqual(0)
  expect(order.indexOf(id)).toBeLessThan(order.indexOf('ArtMesh413'))
  expect(order.indexOf(id)).toBeLessThan(order.indexOf('ArtMesh321'))
  for (const [name, values] of [
    [
      'neutral',
      {
        Param22: 0,
        Param23: 0,
        Param24: 0,
        ParamBodyAngleX: 0,
        ParamBodyAngleY: 0,
        ParamBodyAngleZ: 0,
      },
    ],
    ['left', {ParamBodyAngleX: -10, ParamBodyAngleY: 6, ParamBodyAngleZ: -6}],
    ['right', {ParamBodyAngleX: 10, ParamBodyAngleY: -6, ParamBodyAngleZ: 6}],
    [
      'sway-left',
      {
        Param22: -1,
        Param23: -1,
        Param24: -1,
        ParamBodyAngleX: 0,
        ParamBodyAngleY: 0,
        ParamBodyAngleZ: 0,
      },
    ],
    [
      'sway-right',
      {
        Param22: 1,
        Param23: 1,
        Param24: 1,
        ParamBodyAngleX: 0,
        ParamBodyAngleY: 0,
        ParamBodyAngleZ: 0,
      },
    ],
  ] as const) {
    player.patchParameterBlends(
      Object.fromEntries(
        Object.entries(values).map(([parameter, value]) => [parameter, {mode: 'overwrite', value}]),
      ),
      'interaction',
    )
    Object.entries(values).forEach(([parameter, value]) =>
      expect(player.getParameterValue(parameter)).toBe(value),
    )
    expect(visible().length).toBeGreaterThan(0)
    const root = player.pickPart(cap('root'))
    const end = player.pickPart(cap('bag'))
    expect(root).toBeDefined()
    expect(root).not.toBe(id)
    expect(end).toBeDefined()
    expect(end).not.toBe(id)
    const pouchVertices = renderer.getPartVertices(pouch.id)!
    const expected = {
      x: attachment.indices.reduce(
        (sum, index, offset) => sum + pouchVertices[index * 2]! * attachment.weights[offset]!,
        0,
      ),
      y: attachment.indices.reduce(
        (sum, index, offset) => sum + pouchVertices[index * 2 + 1]! * attachment.weights[offset]!,
        0,
      ),
    }
    const actual = vertexAt(1888, 365)
    expect(Math.hypot(actual.x - expected.x, actual.y - expected.y)).toBeLessThan(4)
    if (name.startsWith('sway')) {
      const root = vertexAt(240, 365)
      expect(Math.hypot(root.x - waistAnchor.x, root.y - waistAnchor.y)).toBeLessThan(0.01)
    }
    // The captured frame must finish before the next pose replaces it.
    // eslint-disable-next-line no-await-in-loop
    await page
      .getByRole('main', {name: 'Poffo 위젯'})
      .screenshot({path: `__screenshots__/ash-waist-rear-strap-${name}.png`})
  }
  const painted = visible()[0]!
  player.setParameterValue('Param52', 1)
  expect(player.pickPart(painted)).not.toBe(id)
  expect(errors).not.toHaveBeenCalled()
})

test('should let gravity bend the rear waist strap while keeping both attachments and hardware fixed', async () => {
  const {player, document, renderer, errors} = await mountWidget()
  const id = 'waist-pouch-rear-strap'
  const strap = document.parts.find((part) => part.id === id)!
  expect(document.physics?.chains?.find((chain) => chain.id === 'waist-strap')).toBeDefined()
  // Hold the pouch and inherited physics stationary to measure the strap's independent response.
  player.patchParameterBlends(
    Object.fromEntries(
      ['Param22', 'Param23', 'Param24', 'Param25', 'Param28'].map((parameter) => [
        parameter,
        {mode: 'overwrite', value: 0},
      ]),
    ),
    'interaction',
  )
  player.setPhysicsPreview(true)
  tick(1 / 60)
  expect(player.getParameterValue('WaistRearSag')).toBeCloseTo(1, 2)
  player.setParameterValue('ParamBodyAngleZ', 10)
  const before = [...renderer.getPartVertices(id)!]
  for (let frame = 0; frame < 45; frame += 1) {
    tick(1 / 60)
  }
  const after = [...renderer.getPartVertices(id)!]
  const distance = (index: number) =>
    Math.hypot(
      after[index * 2]! - before[index * 2]!,
      after[index * 2 + 1]! - before[index * 2 + 1]!,
    )
  const flexible = strap.mesh.uvs.flatMap((u, index) =>
    index % 2 === 0 && u * 2172 > 900 && u * 2172 < 1400 ? [index / 2] : [],
  )
  const pinned = strap.mesh.uvs.flatMap((u, index) =>
    index % 2 === 0 && (u * 2172 <= 242 || u * 2172 >= 1464) ? [index / 2] : [],
  )
  expect(Math.max(...flexible.map(distance))).toBeGreaterThan(0.5)
  expect(Math.max(...pinned.map(distance))).toBeLessThan(0.01)
  expect(Math.abs(player.getParameterValue('WaistRearSwing')!)).toBeGreaterThan(0.05)
  player.setParameterValue('ParamBodyAngleZ', 0)
  for (let frame = 0; frame < 240; frame += 1) {
    tick(1 / 60)
  }
  expect(player.getParameterValue('WaistRearSwing')).toBeCloseTo(0, 2)
  expect(player.getParameterValue('WaistRearSag')).toBeCloseTo(1, 2)
  expect(errors).not.toHaveBeenCalled()
})
