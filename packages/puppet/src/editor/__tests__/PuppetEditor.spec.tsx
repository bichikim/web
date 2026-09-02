/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type Player, type PuppetDocument, serializeDocument} from '../../player'
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
  vi.clearAllMocks()
})

describe('PuppetEditor', () => {
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
    expect(view.getByRole('heading', {name: 'Inspector'})).toBeVisible()
    expect(view.container.querySelector('.inspector-panel.parameter-panel')).toBeNull()
    expect(view.getByRole('button', {name: 'JSON 내보내기'})).toBeVisible()
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())

    fireEvent.click(view.getByRole('button', {name: '애니메이션'}))
    expect(view.getByText('idle-deform')).toBeVisible()
    expect(view.getByRole('region', {name: '저장 데이터 플레이어 미리보기'})).toBeVisible()
    const playerOptions = mocks.createPlayer.mock.calls[0]?.[0]

    playerOptions?.onFrame?.({duration: 2, motionId: 'idle-deform', time: 1})
    await waitFor(() =>
      expect(view.container.querySelectorAll('circle')[4]?.getAttribute('cy')).toBe('176'),
    )

    fireEvent.click(view.getByRole('button', {name: '재생'}))
    expect(player.play).toHaveBeenCalledOnce()
    fireEvent.click(view.getByRole('button', {name: '정지'}))
    expect(player.pause).toHaveBeenCalledTimes(2)

    fireEvent.input(view.getByRole('slider', {name: '재생 위치'}), {target: {value: '1'}})
    expect(player.seek).toHaveBeenCalledWith(1)
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

  test('should store animation edits as parameter tracks', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    fireEvent.click(view.getByRole('button', {name: '애니메이션'}))
    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 현재 값'}), {
      target: {value: '15'},
    })

    await waitFor(() => {
      const document: PuppetDocument | undefined = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.motions[0]?.tracks).toEqual(
        expect.arrayContaining([
          {keyframes: [{time: 0, value: 15}], kind: 'parameter', parameterId: 'angle-x'},
        ]),
      )
    })
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
    fireEvent.input(screen.getByLabelText(/정점 간격/), {target: {value: '32'}})
    fireEvent.input(screen.getByLabelText(/투명 판정값/), {target: {value: '20'}})
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
  ])('should disable automatic mesh generation for a $state part', ({locked, visible}) => {
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

    expect(screen.getByRole('button', {name: '자동 메시'})).toBeDisabled()
  })

  test('should reopen a serialized two-dimensional document', async () => {
    const document = createDemoDocument()
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.change(view.getByLabelText('JSON 가져오기'), {
      target: {
        files: [
          new File([serializeDocument(document)], 'two-dimensional.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    await waitFor(() => {
      const reopenedDocument = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(reopenedDocument).toMatchObject({version: 2})
      expect(reopenedDocument?.parameterBindings?.[0]?.keyforms).toHaveLength(9)
    })
    expect(view.container.querySelectorAll('.parameter-grid-keyform')).toHaveLength(9)
  })

  test('should create a new two-dimensional parameter binding', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.click(view.getByRole('button', {name: '2차원 Parameter 추가'}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameters).toHaveLength(4)
      expect(document?.parameterBindings).toHaveLength(2)
      expect(document?.parameterBindings?.[1]?.keyforms).toHaveLength(9)
    })
  })

  test('should add and delete a sparse two-dimensional keyform at the current values', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {
      target: {value: '15'},
    })
    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle Y 값'}), {
      target: {value: '15'},
    })
    fireEvent.click(view.getByRole('button', {name: '+ 현재 값에 키폼'}))

    await waitFor(() => {
      expect(view.container.querySelectorAll('.parameter-grid-keyform')).toHaveLength(10)
      expect(
        onDocumentChange.mock.calls.at(-1)?.[0]?.parameterBindings?.[0]?.keyforms,
      ).toHaveLength(10)
    })

    fireEvent.click(view.getByRole('button', {name: '선택 키폼 삭제'}))

    await waitFor(() => {
      expect(view.container.querySelectorAll('.parameter-grid-keyform')).toHaveLength(9)
      expect(
        onDocumentChange.mock.calls.at(-1)?.[0]?.parameterBindings?.[0]?.keyforms,
      ).toHaveLength(9)
    })
  })

  test('should preserve and send values from multiple parameter bindings together', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor />)

    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    fireEvent.input(view.getByRole('spinbutton', {name: 'Angle X 값'}), {
      target: {value: '15'},
    })
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {
      target: {value: '10'},
    })
    fireEvent.click(view.getByRole('button', {name: 'Angle X'}))

    expect(view.getByRole('spinbutton', {name: 'Angle X 값'})).toHaveValue(15)
    await waitFor(() =>
      expect(player.setParameterValues).toHaveBeenLastCalledWith({
        'angle-x': 15,
        'angle-y': 0,
        'parameter-3': 10,
      }),
    )
  })

  test('should activate an inactive parameter track at the clicked values', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor />)

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    await waitFor(() =>
      expect(view.getByRole('button', {name: 'Parameter 3'})).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )

    const grid = view.container.querySelector('.parameter-grid') as HTMLDivElement
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      bottom: 232,
      height: 132,
      left: 100,
      right: 232,
      toJSON: () => ({}),
      top: 100,
      width: 132,
      x: 100,
      y: 100,
    })
    fireEvent(
      grid,
      new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 232, clientY: 100}),
    )

    await waitFor(() => {
      expect(view.getByRole('button', {name: 'Angle X'})).toHaveAttribute('aria-pressed', 'true')
      expect(view.getByRole('spinbutton', {name: 'Angle X 값'})).toHaveValue(30)
      expect(view.getByRole('spinbutton', {name: 'Angle Y 값'})).toHaveValue(30)
    })
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

  test('should move a dragged keyform in the editor document', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      bottom: 76,
      height: 76,
      left: 100,
      right: 700,
      toJSON: () => ({}),
      top: 0,
      width: 600,
      x: 100,
      y: 0,
    })
    const marker = view.getByRole('button', {name: 'Parameter 3 0 키폼'})

    marker.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 400}))
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 550}))
    window.dispatchEvent(new MouseEvent('pointerup'))

    await waitFor(() => {
      const document: PuppetDocument | undefined = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[1]?.keyforms.map((keyform) => keyform.values)).toEqual([
        [15],
      ])
    })
    expect(view.getByRole('button', {name: 'Parameter 3 15 키폼'})).toHaveAttribute(
      'aria-pressed',
      'true',
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

  test('should connect a selected group to the active parameter', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))
    expect(view.getByText('대상 1 · 선택 2개 파트')).toBeVisible()
    expect(view.container.querySelector('.mesh-editor [data-part-id="mesh-preview"]')).toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-circle"]'),
    ).not.toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-diamond"]'),
    ).not.toBeNull()
    expect(view.container.querySelectorAll('.mesh-editor circle')).toHaveLength(18)

    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결'}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]?.targetPartIds).toEqual([
        'mesh-preview',
        'shape-circle',
        'shape-diamond',
      ])
    })
    const modelingPanel = view.getByRole('region', {name: 'Parameter와 키폼 편집'})
    expect(within(modelingPanel).getAllByText('Angle X').length).toBeGreaterThan(0)
    expect(view.getByRole('button', {name: '선택 레이어 연결'})).toBeDisabled()

    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결 해제'}))
    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]?.targetPartIds).toEqual(['mesh-preview'])
    })
  })

  test('should delete a parameter only after swiping beyond the threshold and releasing', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    const parameter = view.getByRole('button', {name: 'Angle X'})
    parameter.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 200}))
    window.dispatchEvent(new MouseEvent('pointermove', {clientX: 120}))
    expect(view.getByText('놓아 삭제')).toBeVisible()
    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    window.dispatchEvent(new MouseEvent('pointerup'))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameters).toEqual([])
    })
    expect(view.queryByRole('button', {name: 'Angle X'})).not.toBeInTheDocument()
    expect(view.getByText('Parameter를 추가하세요.')).toBeVisible()
  })

  test('should preserve the active parameter when deleting another parameter', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor />)

    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))
    const inactiveParameter = view.getByRole('button', {name: 'Parameter 3'})

    expect(view.getByRole('button', {name: 'Parameter 4'})).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(inactiveParameter, {key: 'Delete'})
    fireEvent.keyDown(inactiveParameter, {key: 'Delete'})

    expect(view.queryByRole('button', {name: 'Parameter 3'})).not.toBeInTheDocument()
    expect(view.getByRole('button', {name: 'Parameter 4'})).toHaveAttribute('aria-pressed', 'true')
  })
})
