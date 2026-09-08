/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type Player,
  type PuppetDocument,
  serializeDocument,
} from '../../player'

import {PuppetEditor} from '../PuppetEditor'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
  createPlayer: vi.fn(),
  importPng: vi.fn(),
  readTexturePixels: vi.fn(),
}))
const player: Player = {
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  setParameterValues: vi.fn(),
  updateDocument: vi.fn(() => true),
}

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
  test('should leave mesh editing when the part selection is cleared', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={{...createDemoDocument(), motions: []}} />
    ))
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
    expect(view.getByRole('complementary', {name: '선택 작업'})).toContainElement(
      view.getByRole('group', {name: '정점 편집 방식'}),
    )
    expect(view.container.querySelector('.viewport-tools')).not.toContainElement(
      view.getByRole('group', {name: '정점 편집 방식'}),
    )
    fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
    expect(view.getByRole('button', {name: '기준 배치'})).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(view.container.querySelector('.layer-scroll')!)
    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    expect(view.getByRole('button', {name: '변형 편집'})).toHaveAttribute('aria-pressed', 'true')
  })

  test('should explain unsupported mesh editing before a drag starts', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const document: PuppetDocument = {
      ...createDemoDocument(),
      motions: [
        {
          duration: 1,
          id: 'vertex-motion',
          tracks: [
            {
              kind: 'vertex',
              partId: 'mesh-preview',
              axis: 'x',
              vertexIndex: 0,
              keyframes: [{time: 0, value: 0}],
            },
          ],
        },
      ],
    }
    const view = render(() => <PuppetEditor initialDocument={document} />)
    expect(view.getByRole('button', {name: '기준 배치'})).toBeDisabled()
    expect(view.container.querySelector('.mesh-mode-controls')).toHaveAttribute(
      'data-tooltip',
      '정점 애니메이션 트랙이 있는 파츠는 메시 편집을 지원하지 않습니다.',
    )
  })

  test('should render the editor workspace and initialize its player', async () => {
    mocks.createPlayer.mockResolvedValue(player)

    const view = render(() => <PuppetEditor />)

    expect(view.getByRole('region', {name: 'Parameter 정점 형태 편집'})).toBeVisible()
    expect(
      view.queryByText('문서를 검증한 뒤 플레이어에 적용하고 있습니다.'),
    ).not.toBeInTheDocument()
    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.container.querySelectorAll('.parameter-grid-keyform')).toHaveLength(9)
    expect(view.getByRole('region', {name: 'Parameter와 키폼 편집'})).toContainElement(
      view.getByRole('region', {name: 'Parameters'}),
    )
    expect(view.getByRole('complementary', {name: '선택 작업'})).toBeVisible()
    expect(view.container.querySelector('.inspector-panel.parameter-panel')).toBeNull()
    expect(screen.getByRole('button', {name: 'JSON 내보내기'})).toBeVisible()
    expect(view.getByRole('group', {name: '보기 컨트롤'})).toContainElement(
      view.getByRole('button', {name: '마스크 경계 표시'}),
    )
    expect(view.getByRole('group', {name: '표시 설정'})).toContainElement(
      view.getByRole('button', {name: '마스크 경계 표시'}),
    )
    expect(view.container.querySelector('.toolbar')).not.toContainElement(
      view.getByRole('button', {name: '마스크 경계 표시'}),
    )
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())

    fireEvent.click(view.getByRole('button', {name: '애니메이션'}))
    expect(view.getByText('idle-deform')).toBeVisible()
    expect(view.getByRole('region', {name: '저장 데이터 플레이어 미리보기'})).toBeVisible()
    const playerOptions = mocks.createPlayer.mock.calls[0]?.[0]

    playerOptions?.onFrame?.({duration: 2, motionId: 'idle-deform', time: 1})
    await waitFor(() =>
      expect(
        view.container
          .querySelectorAll('[data-part-id="mesh-preview"] circle')[4]
          ?.getAttribute('cy'),
      ).toBe('176'),
    )

    fireEvent.click(view.getByRole('button', {name: '재생'}))
    expect(player.play).toHaveBeenCalledOnce()
    fireEvent.click(view.getByRole('button', {name: '정지'}))
    expect(player.pause).toHaveBeenCalledTimes(2)

    await waitFor(() =>
      expect(view.getByRole('slider', {name: '재생 위치'})).toHaveAttribute('aria-valuenow', '1'),
    )
    fireEvent.focus(view.getByRole('slider', {name: '재생 위치'}))
    fireEvent.keyDown(view.getByRole('slider', {name: '재생 위치'}), {key: 'End'})
    expect(player.seek).toHaveBeenCalledWith(2)
  })

  test('should edit mesh topology only from the modeling workspace and include it in history', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    const svg = view.container.querySelector<SVGSVGElement>('svg[aria-label="메시 정점 편집 영역"]')

    expect(svg).not.toBeNull()

    if (svg === null) {
      throw new Error('메시 정점 편집 영역을 찾지 못했습니다.')
    }

    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      bottom: 720,
      height: 720,
      left: 0,
      right: 960,
      toJSON: () => ({}),
      top: 0,
      width: 960,
      x: 0,
      y: 0,
    })
    fireEvent(svg, new MouseEvent('dblclick', {bubbles: true, clientX: 480, clientY: 116}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(12)
    })
    expect(parseDocument(serializeDocument(onDocumentChange.mock.calls.at(-1)![0]!)).ok).toBe(true)

    const addedVertex = view.container.querySelectorAll('[data-part-id="mesh-preview"] circle')[5]
    expect(addedVertex).toBeDefined()
    if (addedVertex !== undefined) {
      fireEvent.pointerDown(addedVertex, {button: 0})
    }
    fireEvent.keyDown(view.getByLabelText('메시 정점 편집 영역'), {key: 'Backspace'})

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(10)
    })

    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(12)
    })

    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parts[0]?.mesh.vertices).toHaveLength(10)
    })

    fireEvent.click(view.getByRole('button', {name: '애니메이션'}))

    const centerVertex = view.container.querySelectorAll('[data-part-id="mesh-preview"] circle')[4]
    expect(centerVertex).toBeDefined()
    if (centerVertex !== undefined) {
      fireEvent.pointerDown(centerVertex, {button: 0})
    }
  })

  test('should toggle the left, right, and bottom editor panels from the toolbar', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor />)
    const editor = view.container.querySelector('.puppet-editor')

    fireEvent.click(view.getByRole('button', {name: '왼쪽 패널 닫기'}))
    fireEvent.click(view.getByRole('button', {name: '오른쪽 패널 닫기'}))
    fireEvent.click(view.getByRole('button', {name: '아래 프레임 닫기'}))
    expect(editor).toHaveClass('left-panel-closed', 'right-panel-closed', 'bottom-panel-closed')

    fireEvent.click(view.getByRole('button', {name: '왼쪽 패널 열기'}))
    fireEvent.click(view.getByRole('button', {name: '오른쪽 패널 열기'}))
    fireEvent.click(view.getByRole('button', {name: '아래 프레임 열기'}))
    expect(editor).not.toHaveClass('left-panel-closed', 'right-panel-closed', 'bottom-panel-closed')
  })

  test('should undo and redo document edits from the toolbar', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    const undoButton = screen.getByRole('button', {name: '실행 취소'})
    const redoButton = screen.getByRole('button', {name: '다시 실행'})

    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    await waitFor(() => expect(undoButton).toBeEnabled())
    expect(undoButton).toHaveAccessibleDescription('1단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z')

    fireEvent.click(undoButton)
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(2)
    })
    expect(redoButton).toBeEnabled()

    fireEvent.click(redoButton)
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
    })
  })

  test('should group a scrubbed number field into one history entry', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    const opacityField = view.getByRole('spinbutton', {name: '파트 불투명도'})
    const undoButton = screen.getByRole('button', {name: '실행 취소'})

    fireEvent(opacityField, new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}))
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 90}))
    fireEvent(window, new MouseEvent('pointermove', {bubbles: true, clientX: 80}))
    fireEvent(window, new MouseEvent('pointerup', {bubbles: true, clientX: 80}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(
        document?.parameterBindings?.[0]?.keyforms
          .flatMap((keyform) => keyform.parts)
          .find((part) => part.properties?.opacity !== undefined)?.properties?.opacity,
      ).toBeCloseTo(0.9)
    })
    expect(undoButton).toHaveAccessibleDescription('1단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z')

    fireEvent.click(undoButton)

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(
        document?.parameterBindings?.[0]?.keyforms
          .flatMap((keyform) => keyform.parts)
          .some((part) => part.properties?.opacity !== undefined),
      ).toBe(false)
    })
  })

  test('should handle document history keyboard shortcuts outside editable controls', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.keyDown(window, {ctrlKey: true, key: 'z'})
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(2)
    })

    fireEvent.keyDown(window, {ctrlKey: true, key: 'y'})
    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
    })

    const nameInput = view.getByRole('spinbutton', {name: 'Parameter 3 값'})
    fireEvent.keyDown(nameInput, {ctrlKey: true, key: 'z'})
    expect(onDocumentChange.mock.calls.at(-1)?.[0]?.parameters).toHaveLength(3)
  })

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

  test('should notify only document changes through the latest external callback', async () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()
    const [listener, setListener] = createSignal({callback: firstCallback})
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={listener().callback} />)

    await waitFor(() => expect(firstCallback).toHaveBeenCalledOnce())
    setListener({callback: secondCallback})
    await Promise.resolve()

    expect(secondCallback).not.toHaveBeenCalled()

    fireEvent.dblClick(view.getByRole('button', {name: 'Angle X'}))
    fireEvent.input(view.getByRole('textbox', {name: 'Parameter 이름'}), {
      target: {value: 'Angle Y'},
    })
    fireEvent.keyDown(view.getByRole('textbox', {name: 'Parameter 이름'}), {key: 'Enter'})

    await waitFor(() =>
      expect(secondCallback).toHaveBeenLastCalledWith(
        expect.objectContaining({
          parameters: expect.arrayContaining([expect.objectContaining({name: 'Angle Y'})]),
        }),
      ),
    )
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

    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    const input = view.getByLabelText('PNG 불러오기')

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
    const view = render(() => <PuppetEditor />)

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    fireEvent.change(view.getByLabelText('PNG 불러오기'), {
      target: {files: [new File(['replacement'], 'replacement.png', {type: 'image/png'})]},
    })

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(2))
    expect(replacementPlayer.pause).toHaveBeenCalledOnce()
  })

  test('should hide editing overlays without resetting the canvas or selection', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor />)
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
    const canvas = view.container.querySelector('canvas')
    const overlays = view.container.querySelector('.editing-overlays')
    const vertex = overlays?.querySelector('circle')
    const button = view.getByRole('button', {name: '편집 UI 표시'})
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(overlays).toHaveAttribute('aria-hidden', 'true')
    expect(overlays).toHaveProperty('inert', true)
    expect(view.container.querySelector('canvas')).toBe(canvas)
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(overlays).toHaveProperty('inert', false)
    expect(overlays?.querySelector('circle')).toBe(vertex)
  })
})
