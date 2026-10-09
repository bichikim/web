/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createDemoDocument, type Player} from '../../player'
import {PuppetEditor} from '../PuppetEditor'
import {createPlayerFixture} from './fixtures/player'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
  createPlayer: vi.fn(),
  importPng: vi.fn(),
  readTexturePixels: vi.fn(),
}))
const player = createPlayerFixture()

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))

vi.mock('../import-png', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../import-png')>()),
  importPng: mocks.importPng,
}))

vi.mock('../auto-mesh-part', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../auto-mesh-part')>()),
  autoMeshPart: mocks.autoMeshPart,
}))

vi.mock('../internal/read-texture-pixels', () => ({
  readTexturePixels: mocks.readTexturePixels,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  localStorage.clear()
  mocks.createPlayer.mockResolvedValue(player)
})

describe('PuppetEditor', () => {
  test('should configure automatic mesh generation before replacing the active part', async () => {
    const document = createDemoDocument()
    const generatedDocument = {...document, motions: []}
    const pixels = {data: new Uint8ClampedArray(4), height: 1, width: 1}
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    mocks.readTexturePixels.mockResolvedValue({ok: true, pixels})
    mocks.autoMeshPart.mockReturnValue({document: generatedDocument, ok: true})
    const view = render(() => (
      <PuppetEditor initialDocument={document} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: '자동 메시'}))
    expect(screen.getByRole('dialog', {name: '자동 메시 생성'})).toBeVisible()
    fireEvent.input(screen.getByRole('spinbutton', {name: '정점 간격'}), {
      target: {value: '32'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '투명 판정값'}), {
      target: {value: '20'},
    })
    fireEvent.click(screen.getByRole('button', {name: '자동 메시 생성'}))

    await waitFor(() =>
      expect(mocks.autoMeshPart).toHaveBeenCalledWith({
        document,
        partId: 'mesh-preview',
        pixels,
        settings: {alphaThreshold: 20, cellSize: 32},
      }),
    )
    await waitFor(() => expect(onDocumentChange).toHaveBeenLastCalledWith(generatedDocument))
    expect(screen.queryByRole('dialog', {name: '자동 메시 생성'})).not.toBeInTheDocument()
  })

  test.each([
    {locked: true, state: 'locked', visible: true},
    {locked: false, state: 'hidden', visible: false},
  ])('should hide automatic mesh generation for a $state part', ({locked, visible}) => {
    const document = createDemoDocument()
    const restrictedDocument = {
      ...document,
      scene: {
        roots: document.scene!.roots.map((node) =>
          node.id === 'mesh-preview' ? {...node, locked, visible} : node,
        ),
      },
    }

    render(() => <PuppetEditor initialDocument={restrictedDocument} />)

    expect(screen.queryByRole('button', {name: '자동 메시'})).toBeNull()
  })

  test('should generate meshes for every selected part', async () => {
    const document = createDemoDocument()
    const firstDocument = {...document, motions: []}
    const secondDocument = {...firstDocument, motions: document.motions.slice(0, 1)}
    const pixels = {data: new Uint8ClampedArray(4), height: 1, width: 1}
    const onDocumentChange = vi.fn()
    mocks.readTexturePixels.mockResolvedValue({ok: true, pixels})
    mocks.autoMeshPart
      .mockReturnValueOnce({document: firstDocument, ok: true})
      .mockReturnValueOnce({document: secondDocument, ok: true})
    const view = render(() => (
      <PuppetEditor initialDocument={document} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: '자동 메시'}))
    fireEvent.click(screen.getByRole('button', {name: '자동 메시 생성'}))

    await waitFor(() => expect(mocks.autoMeshPart).toHaveBeenCalledTimes(2))
    expect(mocks.autoMeshPart.mock.calls.map(([options]) => options.partId)).toEqual([
      'shape-circle',
      'shape-diamond',
    ])
    expect(onDocumentChange).toHaveBeenLastCalledWith(secondDocument)
  })

  test('should retain the latest PNG when an earlier import finishes later', async () => {
    const firstDocument = createDemoDocument()
    const secondDocument = {...createDemoDocument(), viewport: {height: 240, width: 320}}
    const onDocumentChange = vi.fn()
    let resolveFirst:
      | ((value: {readonly document: typeof firstDocument; readonly ok: true}) => void)
      | undefined
    let resolveSecond:
      | ((value: {readonly document: typeof secondDocument; readonly ok: true}) => void)
      | undefined
    const firstImport = new Promise<{readonly document: typeof firstDocument; readonly ok: true}>(
      (resolve) => {
        resolveFirst = resolve
      },
    )
    const secondImport = new Promise<{
      readonly document: typeof secondDocument
      readonly ok: true
    }>((resolve) => {
      resolveSecond = resolve
    })

    mocks.createPlayer.mockResolvedValue(player)
    mocks.importPng.mockReturnValueOnce(firstImport).mockReturnValueOnce(secondImport)

    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    const input = screen.getByLabelText('불러오기')

    fireEvent.change(input, {
      target: {files: [new File(['first'], 'first.png', {type: 'image/png'})]},
    })
    fireEvent.change(input, {
      target: {files: [new File(['second'], 'second.png', {type: 'image/png'})]},
    })
    resolveSecond?.({document: secondDocument, ok: true})
    await waitFor(() => expect(onDocumentChange).toHaveBeenLastCalledWith(secondDocument))

    resolveFirst?.({document: firstDocument, ok: true})
    await firstImport
    await Promise.resolve()
    expect(onDocumentChange).toHaveBeenLastCalledWith(secondDocument)
  })

  test('should retain paused playback when the player is recreated', async () => {
    const replacementPlayer: Player = {...player, pause: vi.fn()}
    const replacementDocument = createDemoDocument()
    mocks.createPlayer.mockResolvedValueOnce(player).mockResolvedValueOnce(replacementPlayer)
    mocks.importPng.mockResolvedValue({document: replacementDocument, ok: true})
    player.updateDocument = vi.fn(() => false)
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('불러오기'), {
      target: {files: [new File(['replacement'], 'replacement.png', {type: 'image/png'})]},
    })

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(2))
    expect(replacementPlayer.pause).toHaveBeenCalledOnce()
  })
})
