/** @vitest-environment jsdom */

import {createPlayerFixture} from './fixtures/player'

import {render, waitFor} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type Player, type PuppetDocument} from '../../player'
import {PlayerCanvas} from '../PlayerCanvas'
import type {SpatialThreeSurface} from '../internal/spatial-three-overlay'

const mocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
  createSpatialThreeOverlay: vi.fn(),
  overlay: {
    destroy: vi.fn(),
    prepare: vi.fn(),
    render: vi.fn(),
    update: vi.fn(),
  },
  updateDocument: vi.fn(() => true),
}))
const player: Player = {...createPlayerFixture(), updateDocument: mocks.updateDocument}

mocks.createPlayer.mockResolvedValue(player)
mocks.createSpatialThreeOverlay.mockReturnValue(mocks.overlay)

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))
vi.mock('../internal/spatial-three-overlay', () => ({
  createSpatialThreeOverlay: mocks.createSpatialThreeOverlay,
}))

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('PlayerCanvas', () => {
  test('should keep consumer signal reads outside player effects', async () => {
    const document = createDemoDocument()
    const [external, setExternal] = createSignal(0)
    const onFrame = vi.fn(() => external())
    const onStatusChange = vi.fn(() => external())
    const onPlayerChange = vi.fn(() => external())
    const setParameterValues = vi.fn(() => {
      mocks.createPlayer.mock.calls[0]?.[0].onFrame({duration: 2, motionId: 'idle-deform', time: 0})
    })
    mocks.createPlayer.mockResolvedValueOnce({...player, setParameterValues})
    render(() => (
      <PlayerCanvas
        document={document}
        onFrame={onFrame}
        onStatusChange={onStatusChange}
        onPlayerChange={onPlayerChange}
      />
    ))
    await waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith('ready'))
    const frames = onFrame.mock.calls.length
    const statuses = onStatusChange.mock.calls.length
    const players = onPlayerChange.mock.calls.length
    expect(frames).toBeGreaterThan(0)
    setExternal(1)
    expect(onFrame).toHaveBeenCalledTimes(frames)
    expect(onStatusChange).toHaveBeenCalledTimes(statuses)
    expect(onPlayerChange).toHaveBeenCalledTimes(players)
    expect(mocks.updateDocument).not.toHaveBeenCalled()
  })

  test('should render the selected 3D surface in the Pixi canvas and release it', async () => {
    const document = createDemoDocument()
    const surface = {document, node: {} as SpatialThreeSurface['node']}
    const [selectedSurface, setSelectedSurface] = createSignal<SpatialThreeSurface | undefined>(
      surface,
    )
    const view = render(() => (
      <PlayerCanvas document={document} spatialSurface={selectedSurface()} />
    ))

    await waitFor(() => expect(mocks.createSpatialThreeOverlay).toHaveBeenCalledOnce())
    const canvas = view.container.querySelector('canvas')
    expect(mocks.createSpatialThreeOverlay).toHaveBeenCalledWith(canvas)
    expect(mocks.overlay.update).toHaveBeenCalledWith(surface)
    const options = mocks.createPlayer.mock.calls[0]?.[0]
    options.onBeforeRender()
    options.onAfterRender()
    expect(mocks.overlay.prepare).toHaveBeenCalledOnce()
    expect(mocks.overlay.render).toHaveBeenCalledOnce()

    setSelectedSurface(undefined)
    await waitFor(() => expect(mocks.overlay.update).toHaveBeenLastCalledWith(undefined))
    expect(player.redraw).toHaveBeenCalled()
    view.unmount()
    expect(mocks.overlay.destroy).toHaveBeenCalledOnce()
  })

  test('should update the existing player when mesh data changes', async () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const view = render(() => <PlayerCanvas document={document()} />)

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(1))
    expect(mocks.createPlayer).toHaveBeenCalledWith(
      expect.objectContaining({viewportPadding: 0.25}),
    )
    expect(mocks.createPlayer.mock.calls[0]?.[0].document).toBe(initialDocument)
    const canvas = view.container.querySelector('canvas')
    const firstPart = initialDocument.parts[0]

    expect(firstPart).toBeDefined()

    setDocument({
      ...initialDocument,
      parts:
        firstPart === undefined
          ? []
          : [
              {
                ...firstPart,
                mesh: {
                  ...firstPart.mesh,
                  vertices: firstPart.mesh.vertices.map((value, index) =>
                    index === 0 ? value + 1 : value,
                  ),
                },
              },
            ],
    })

    await waitFor(() => expect(mocks.updateDocument).toHaveBeenCalledTimes(1))
    expect(mocks.createPlayer).toHaveBeenCalledTimes(1)
    expect(view.container.querySelector('canvas')).toBe(canvas)
  })

  test('should expose player controls and forward rendered frames', async () => {
    const onFrame = vi.fn()
    const onPlayerChange = vi.fn()
    const controlledPlayer: Player = {...player, destroy: vi.fn()}
    mocks.createPlayer.mockResolvedValueOnce(controlledPlayer)
    const view = render(() => (
      <PlayerCanvas
        document={createDemoDocument()}
        onFrame={onFrame}
        onPlayerChange={onPlayerChange}
      />
    ))

    await waitFor(() => expect(onPlayerChange).toHaveBeenLastCalledWith(controlledPlayer))
    const playerOptions = mocks.createPlayer.mock.calls[0]?.[0]
    const frame = {duration: 2, motionId: 'idle-deform', time: 0.5}

    playerOptions?.onFrame?.(frame)
    expect(onFrame).toHaveBeenCalledWith(frame)

    view.unmount()
    expect(controlledPlayer.destroy).toHaveBeenCalledOnce()
    expect(onPlayerChange).toHaveBeenLastCalledWith(null)
  })

  test('should apply reactive parameter values without recreating the player', async () => {
    const [parameterValues, setParameterValues] = createSignal({'angle-x': 0, 'angle-y': 0})
    const parameterPlayer: Player = {...player, setParameterValues: vi.fn()}
    mocks.createPlayer.mockResolvedValueOnce(parameterPlayer)

    render(() => (
      <PlayerCanvas document={createDemoDocument()} parameterValues={parameterValues()} />
    ))

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(parameterPlayer.setParameterValues).toHaveBeenLastCalledWith({
        'angle-x': 0,
        'angle-y': 0,
      }),
    )
    expect(mocks.createPlayer.mock.calls[0]?.[0].parameterValues).toEqual({
      'angle-x': 0,
      'angle-y': 0,
    })

    setParameterValues({'angle-x': 15, 'angle-y': -15})
    await waitFor(() =>
      expect(parameterPlayer.setParameterValues).toHaveBeenLastCalledWith({
        'angle-x': 15,
        'angle-y': -15,
      }),
    )
    expect(mocks.createPlayer).toHaveBeenCalledOnce()
  })

  test('should debounce container resize renders without recreating the player', async () => {
    let resizeCallback: ResizeObserverCallback | undefined
    const resizePlayer: Player = {...player, resize: vi.fn()}

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback
        }

        disconnect = vi.fn()
        observe = vi.fn()
        unobserve = vi.fn()
      },
    )
    mocks.createPlayer.mockResolvedValueOnce(resizePlayer)
    const view = render(() => <PlayerCanvas document={createDemoDocument()} />)
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    vi.useFakeTimers()

    resizeCallback?.([], {} as ResizeObserver)
    vi.advanceTimersByTime(75)
    resizeCallback?.([], {} as ResizeObserver)
    vi.advanceTimersByTime(99)
    expect(resizePlayer.resize).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(resizePlayer.resize).toHaveBeenCalledOnce()
    expect(mocks.createPlayer).toHaveBeenCalledOnce()

    resizeCallback?.([], {} as ResizeObserver)
    view.unmount()
    vi.advanceTimersByTime(100)
    expect(resizePlayer.resize).toHaveBeenCalledOnce()
  })

  test('should apply the latest document to a pending player without creating another renderer', async () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onStatusChange = vi.fn()
    const pendingCreatedPlayer: Player = {...player, destroy: vi.fn()}
    let resolvePlayer: ((player: Player) => void) | undefined
    const pendingPlayer = new Promise<Player>((resolve) => {
      resolvePlayer = resolve
    })

    mocks.createPlayer.mockReturnValueOnce(pendingPlayer)

    render(() => <PlayerCanvas document={document()} onStatusChange={onStatusChange} />)
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())

    const latest = {
      ...initialDocument,
      viewport: {...initialDocument.viewport},
    }
    setDocument({...initialDocument, motions: []})
    setDocument(latest)
    expect(mocks.createPlayer).toHaveBeenCalledOnce()

    resolvePlayer?.(pendingCreatedPlayer)
    await pendingPlayer
    await Promise.resolve()

    expect(mocks.updateDocument).toHaveBeenCalledExactlyOnceWith(latest, {})
    expect(pendingCreatedPlayer.destroy).not.toHaveBeenCalled()
    expect(mocks.createPlayer).toHaveBeenCalledOnce()
    expect(onStatusChange).toHaveBeenLastCalledWith('ready')
  })
})

test('should bound a large document backing buffer on a Retina display', async () => {
  vi.stubGlobal('devicePixelRatio', 2)
  const document = {...createDemoDocument(), viewport: {height: 7100, width: 4000}}
  render(() => <PlayerCanvas document={document} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
  const options = mocks.createPlayer.mock.calls[0]?.[0]
  expect(options.resolution * 7100 * 1.5).toBeCloseTo(4096)
  expect(options.document.viewport).toEqual({height: 7100, width: 4000})
})

test('should apply a document and parameter change together without rendering the old document first', async () => {
  const source = createDemoDocument()
  const [document, setDocument] = createSignal(source)
  const [values, setValues] = createSignal({'angle-x': 0})
  render(() => <PlayerCanvas document={document()} parameterValues={values()} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
  await waitFor(() => expect(player.setParameterValues).toHaveBeenCalled())
  vi.mocked(player.setParameterValues).mockClear()
  mocks.updateDocument.mockClear()
  const next = {...source, parts: source.parts.slice()}
  batch(() => {
    setValues({'angle-x': 15})
    setDocument(next)
  })
  expect(mocks.updateDocument).toHaveBeenCalledExactlyOnceWith(next, {'angle-x': 15})
  expect(player.setParameterValues).not.toHaveBeenCalled()
  setValues({'angle-x': 20})
  expect(player.setParameterValues).toHaveBeenCalledExactlyOnceWith({'angle-x': 20})
})

test('should replace a pending renderer only when it cannot accept the latest document', async () => {
  let resolvePending: ((player: Player) => void) | undefined
  const pending = new Promise<Player>((resolve) => {
    resolvePending = resolve
  })
  const previous = {...player, destroy: vi.fn(), updateDocument: vi.fn(() => false)}
  mocks.createPlayer.mockReturnValueOnce(pending).mockResolvedValueOnce(player)
  const source = createDemoDocument()
  const [document, replace] = createSignal(source)
  render(() => <PlayerCanvas document={document()} />)
  const latest = {...source, viewport: {height: 100, width: 100}}
  replace(latest)
  resolvePending?.(previous)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(2))
  expect(previous.destroy).toHaveBeenCalledOnce()
  expect(mocks.createPlayer.mock.calls[1]?.[0].document).toBe(latest)
})

test('should destroy an initialized player that resolves after its viewport unmounts', async () => {
  let resolvePending: ((player: Player) => void) | undefined
  const pending = new Promise<Player>((resolve) => {
    resolvePending = resolve
  })
  const created = {...player, destroy: vi.fn()}
  mocks.createPlayer.mockReturnValueOnce(pending)
  const view = render(() => <PlayerCanvas document={createDemoDocument()} />)
  view.unmount()
  resolvePending?.(created)
  await pending
  expect(created.destroy).toHaveBeenCalledOnce()
})

test('should release a pending player and report a failed document update', async () => {
  let resolvePending: ((player: Player) => void) | undefined
  const pending = new Promise<Player>((resolve) => {
    resolvePending = resolve
  })
  const created = {
    ...player,
    destroy: vi.fn(),
    updateDocument: vi.fn(() => {
      throw new Error('invalid geometry')
    }),
  }
  mocks.createPlayer.mockReturnValueOnce(pending)
  const [document, replace] = createSignal(createDemoDocument())
  const view = render(() => <PlayerCanvas document={document()} />)
  replace(createDemoDocument())
  resolvePending?.(created)
  await waitFor(() => expect(view.getByText('invalid geometry')).toBeInTheDocument())
  expect(created.destroy).toHaveBeenCalledOnce()
  expect(view.container.querySelector('canvas')).toBeNull()
})
