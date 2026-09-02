/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type Player, type PuppetDocument} from '../../player'
import {PlayerCanvas} from '../PlayerCanvas'

const mocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
  updateDocument: vi.fn(() => true),
}))
const player: Player = {
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  setParameterValues: vi.fn(),
  updateDocument: mocks.updateDocument,
}

mocks.createPlayer.mockResolvedValue(player)

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('PlayerCanvas', () => {
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

  test('should discard a pending player when a newer editor document is applied', async () => {
    const initialDocument = createDemoDocument()
    const [document, setDocument] = createSignal<PuppetDocument>(initialDocument)
    const onStatusChange = vi.fn()
    const pendingCreatedPlayer: Player = {...player, destroy: vi.fn()}
    const currentPlayer: Player = {...player, destroy: vi.fn()}
    let resolvePlayer: ((player: Player) => void) | undefined
    const pendingPlayer = new Promise<Player>((resolve) => {
      resolvePlayer = resolve
    })

    mocks.createPlayer.mockReturnValueOnce(pendingPlayer).mockResolvedValueOnce(currentPlayer)

    render(() => <PlayerCanvas document={document()} onStatusChange={onStatusChange} />)
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())

    setDocument({
      ...initialDocument,
      viewport: {...initialDocument.viewport},
    })
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith('ready'))

    resolvePlayer?.(pendingCreatedPlayer)
    await pendingPlayer
    await Promise.resolve()

    expect(pendingCreatedPlayer.destroy).toHaveBeenCalledOnce()
    expect(currentPlayer.destroy).not.toHaveBeenCalled()
    expect(onStatusChange).toHaveBeenLastCalledWith('ready')
  })
})
