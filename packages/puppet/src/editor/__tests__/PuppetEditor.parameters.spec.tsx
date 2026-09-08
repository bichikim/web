/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type Player, type PuppetDocument, serializeDocument} from '../../player'

import {addParameter} from '../internal/parameter-keyforms'
import {createSceneGroup} from '../internal/scene-graph'
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
      expect(reopenedDocument).toMatchObject({version: 1})
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
    fireEvent.click(view.getByRole('button', {name: '현재 값에 키폼'}))

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

  test('should show the union of parameters connected to selected layers', async () => {
    const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})!
    const view = render(() => <PuppetEditor initialDocument={added.document} />)

    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))

    await waitFor(() => {
      expect(view.queryByRole('button', {name: 'Angle X'})).toBeNull()
      expect(view.getByRole('button', {name: 'Parameter 3'})).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}), {ctrlKey: true})

    expect(view.getByRole('button', {name: 'Angle X'})).toBeVisible()
    expect(view.getByRole('button', {name: 'Parameter 3'})).toBeVisible()

    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))

    await waitFor(() => {
      expect(view.queryByRole('button', {name: 'Angle X'})).toBeNull()
      expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()
    })
  })

  test('should not inherit descendant parameters when selecting nested groups', async () => {
    const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})!
    const nested = createSceneGroup(added.document, ['shapes'])!
    const view = render(() => <PuppetEditor initialDocument={nested} />)

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))

    await waitFor(() => {
      expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()
      expect(view.getByRole('button', {name: '1차원 Parameter 추가'})).toBeDisabled()
    })

    fireEvent.click(view.getByRole('button', {name: '새 그룹 레이어 선택'}))

    expect(view.queryByRole('button', {name: 'Parameter 3'})).toBeNull()
    expect(view.getByRole('button', {name: '1차원 Parameter 추가'})).toBeDisabled()
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

  test('should connect multiple selected parts to the active parameter', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}), {ctrlKey: true})
    expect(view.getByText('대상 1 · 선택 3개 노드')).toBeVisible()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="mesh-preview"]'),
    ).not.toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-circle"]'),
    ).not.toBeNull()
    expect(
      view.container.querySelector('.mesh-editor [data-part-id="shape-diamond"]'),
    ).not.toBeNull()
    expect(view.container.querySelectorAll('.mesh-editor circle')).toHaveLength(23)

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

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}), {ctrlKey: true})
    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결 해제'}))
    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]?.targetPartIds).toEqual(['mesh-preview'])
    })
  })

  test('should toggle between selected and all parameters', () => {
    const added = addParameter({document: createDemoDocument(), nodeIds: ['shape-circle']})
    expect(added).toBeDefined()

    const view = render(() => <PuppetEditor initialDocument={added!.document} />)
    const parameterPanel = view.getByRole('region', {name: 'Parameters'})
    const showAllButton = within(parameterPanel).getByRole('button', {
      name: '모든 파라미터 보기',
    })
    const targetActions = showAllButton.closest<HTMLElement>('.parameter-target-actions')

    expect(targetActions).not.toBeNull()
    expect(within(targetActions!).getAllByRole('button')[0]).toBe(showAllButton)
    expect(showAllButton.nextElementSibling).toHaveTextContent('선택 레이어 연결')
    expect(showAllButton).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(parameterPanel).queryByRole('button', {name: 'Parameter 3'}),
    ).not.toBeInTheDocument()

    fireEvent.click(showAllButton)

    expect(showAllButton).toHaveAttribute('aria-pressed', 'true')
    const otherParameter = within(parameterPanel).getByRole('button', {name: 'Parameter 3'})
    expect(otherParameter).toBeVisible()
    fireEvent.click(otherParameter)
    expect(otherParameter).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(showAllButton)

    expect(showAllButton).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(parameterPanel).queryByRole('button', {name: 'Parameter 3'}),
    ).not.toBeInTheDocument()
    expect(within(parameterPanel).getByRole('button', {name: 'Angle X'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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

  test('should edit original keyform properties below full influence and preserve the influence relation', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => <PuppetEditor onDocumentChange={onDocumentChange} />)
    fireEvent.click(view.getByRole('button', {name: 'Angle X / Angle Y · 영향도'}))
    fireEvent.click(view.getByRole('button', {name: '기준 추가'}))
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
    expect(view.getByRole('textbox', {name: '파트 곱하기 색상'})).toBeEnabled()
    fireEvent.input(view.getByRole('spinbutton', {name: '파트 불투명도'}), {target: {value: '0.4'}})
    const blend = view.getByRole('button', {name: /^파트 블렌드 모드/})
    expect(blend).toBeEnabled()
    fireEvent.keyDown(blend, {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: 'screen'}), {key: 'Enter'})
    const inverted = view.getByRole('checkbox', {name: '마스크 반전'})
    expect(inverted).toBeEnabled()
    fireEvent.click(inverted)
    expect(view.getByRole('button', {name: '대상 추가'})).toBeEnabled()
    expect(view.getByRole('button', {name: '레이어에서 선택'})).toBeEnabled()
    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parts[0]?.properties?.blendMode).toBe('screen')
      expect(document?.parts[0]?.properties?.invertedMask).toBe(true)
      const binding = document?.parameterBindings?.[0]
      expect(binding?.influences).toHaveLength(1)
      expect(
        binding?.keyforms.find((keyform) => keyform.values.every((value) => value === 0))?.parts[0]
          ?.properties?.opacity,
      ).toBeCloseTo(0.4)
    })
    expect(view.getByRole('spinbutton', {name: '파트 불투명도'})).toBeEnabled()
  })
})
