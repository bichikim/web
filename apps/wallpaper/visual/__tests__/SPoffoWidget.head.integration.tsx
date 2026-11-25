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
import 'virtual:uno.css'

let ashDocument: playerModule.PreparedPuppetDocument | null = null
let ashBlob: Blob
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
          subscribeFrame: () => undefined,
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
  player.setPhysicsPreview(false)
  const renderer = await vi.mocked(rendererModule.createPlayerRenderer).mock.results[0]!.value
  const document = vi.mocked(playerModule.createPlayer).mock.calls[0]![0].document
  return {document, errors, player, renderer}
}

test.each(['mouse', 'touch'])(
  'should drag Ash head XYZ with a %s pointer and restore the pose',
  async (pointerType) => {
    const {document, errors, player, renderer} = await mountWidget()
    const ids = ['ParamAngleX', 'ParamAngleY', 'ParamAngleZ']
    const parameters = modelTouchParameters(document)
    const grabParts =
      builtinConnectionProfile('builtin:ash')!.connections.touch!.parameters!.ParamAngleX!.parts!
    const candidates = [100, 120, 140].flatMap((y) => [430, 450, 470].map((x) => ({x, y})))
    const point = candidates.find((point) => {
      const part = player.pickPart(point)
      return (
        part !== undefined &&
        grabParts.includes(part) &&
        ids.every((id) => parameters.find((parameter) => parameter.id === id)!.parts.includes(part))
      )
    })!
    expect(point).toBeDefined()
    const part = player.pickPart(point)!
    const mesh = document.parts.find((item) => item.id === part)!.mesh
    const anchor = meshPoint({
      indices: mesh.indices,
      point: renderer.toDocumentPoint(point),
      vertices: renderer.getPartVertices(part)!,
    })!
    const read = () => {
      const vertices = renderer.getPartVertices(part)!
      return anchor.indices.reduce(
        (point, index, i) => ({
          x: point.x + vertices[index * 2]! * anchor.weights[i]!,
          y: point.y + vertices[index * 2 + 1]! * anchor.weights[i]!,
        }),
        {x: 0, y: 0},
      )
    }
    const origin = read()
    const canvas = screen.getByLabelText<HTMLCanvasElement>('Poffo 배경')
    vi.spyOn(canvas, 'setPointerCapture').mockImplementation(() => undefined)
    let frame: FrameRequestCallback = () => undefined
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback
      return 1
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const pointer = (type: string, x: number, y: number, shiftKey = false) =>
      fireEvent(
        canvas,
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType,
          shiftKey,
        }),
      )
    pointer('pointerdown', point.x, point.y)
    pointer('pointermove', point.x + 20, point.y)
    expect(ids.map((id) => player.getParameterValue(id))).toEqual([6, 0, 0])
    const horizontal = read()
    expect(Math.hypot(horizontal.x - origin.x, horizontal.y - origin.y)).toBeGreaterThan(0.0001)
    pointer('pointermove', point.x + 20, point.y + 15)
    expect(ids.map((id) => player.getParameterValue(id))).toEqual([6, -4.5, 0])
    const vertical = read()
    expect(Math.hypot(vertical.x - horizontal.x, vertical.y - horizontal.y)).toBeGreaterThan(0.0001)
    pointer('pointermove', point.x + 20, point.y + 35, true)
    expect(ids.map((id) => player.getParameterValue(id))).toEqual([6, -4.5, 6])
    const tilted = read()
    expect(Math.hypot(tilted.x - vertical.x, tilted.y - vertical.y)).toBeGreaterThan(0.0001)
    expect(player.getParameterValue('Param55')).toBe(0)
    pointer('pointerup', point.x + 20, point.y + 35, true)
    frame(0)
    frame(450)
    expect(ids.map((id) => player.getParameterValue(id))).toEqual([0, 0, 0])
    expect(read()).toEqual(origin)
    expect(errors).not.toHaveBeenCalled()
  },
)

test('should inspect the model coat toggle at both endpoints and restore it', async () => {
  const {document, errors, player, renderer} = await mountWidget()
  const coat = modelTouchParameters(document).find((parameter) => parameter.id === 'Param49')!
  expect(coat).toMatchObject({maximum: 1, minimum: 0, name: 'Remove Coat (Test)'})
  const before = new Map(coat.parts.map((part) => [part, [...renderer.getPartVertices(part)!]]))
  await page
    .getByRole('main', {name: 'Poffo 위젯'})
    .screenshot({path: '__screenshots__/ash-coat-on.png'})
  expect(player.setParameterValue('Param49', 1)).toBe(true)
  expect(player.getParameterValue('Param49')).toBe(1)
  const displacement = Math.max(
    ...coat.parts.map((part) => {
      const vertices = renderer.getPartVertices(part)!
      return Math.max(
        ...before.get(part)!.map((value, index) => Math.abs(value - vertices[index]!)),
      )
    }),
  )
  expect(displacement).toBeGreaterThan(0.001)
  await page
    .getByRole('main', {name: 'Poffo 위젯'})
    .screenshot({path: '__screenshots__/ash-coat-off-test.png'})
  player.setParameterValue('Param49', 0)
  expect(player.getParameterValue('Param49')).toBe(0)
  coat.parts.forEach((part) =>
    expect([...renderer.getPartVertices(part)!]).toEqual(before.get(part)),
  )
  expect(errors).not.toHaveBeenCalled()
})
