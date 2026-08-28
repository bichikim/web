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
  seek: vi.fn(),
  updateDocument: mocks.updateDocument,
}

mocks.createPlayer.mockResolvedValue(player)

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

afterEach(() => {
  vi.clearAllMocks()
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

  test('should discard a pending player when the next document is invalid', async () => {
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

    setDocument({
      ...initialDocument,
      parts: initialDocument.parts.map((part, index) =>
        index === 0 ? {...part, mesh: {...part.mesh, vertices: []}} : part,
      ),
    })
    await waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith('error'))

    resolvePlayer?.(pendingCreatedPlayer)
    await pendingPlayer
    await Promise.resolve()

    expect(pendingCreatedPlayer.destroy).toHaveBeenCalledOnce()
    expect(onStatusChange).toHaveBeenLastCalledWith('error')
  })
})
