/** @vitest-environment jsdom */

import {waitForSelectionReady} from '../../../../../packages/puppet/src/editor/__tests__/fixtures/selection'

import {createPlayerFixture} from '../../__tests__/fixtures/player'

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  getDocumentScene,
  parseDocument,
  type Player,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  serializeDocument,
} from '@winter-love/puppet/player'
import {transformDeformerPoint} from '../../../../../packages/puppet/src/deformation'
import {getDeformerAngle} from '../../../../../packages/puppet/src/editor/internal/deformer-transform'
import * as keyforms from '../../../../../packages/puppet/src/editor/internal/__tests__/parameter-keyforms/fixtures'
import {
  createDeformer,
  getSceneNode,
} from '../../../../../packages/puppet/src/editor/internal/scene-graph'
import {EditorFixture as PuppetEditor} from './fixtures/Editor'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
  createPlayer: vi.fn(),
  importPng: vi.fn(),
  readTexturePixels: vi.fn(),
}))
const player = createPlayerFixture()

vi.mock('@winter-love/puppet/player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@winter-love/puppet/player')>()),
  createPlayer: mocks.createPlayer,
}))

vi.mock('../../../../../packages/puppet/src/editor/import-png', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../../../packages/puppet/src/editor/import-png')
  >()),
  importPng: mocks.importPng,
}))

vi.mock('../../../../../packages/puppet/src/editor/auto-mesh-part', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../../../packages/puppet/src/editor/auto-mesh-part')
  >()),
  autoMeshPart: mocks.autoMeshPart,
}))

vi.mock('../../../../../packages/puppet/src/editor/internal/read-texture-pixels', () => ({
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
  test('should hide portaled deformer controls during playback and restore them on pause', async () => {
    const document = createDeformer(createDemoDocument(), ['mesh-preview'])!
    const view = render(() => (
      <PuppetEditor initialDocument={document} initialWorkspace="animation" />
    ))
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
    await waitForSelectionReady()
    expect(view.getByRole('group', {name: '디포머 편집 도구'})).toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: '재생'}))
    expect(view.queryByRole('group', {name: '디포머 편집 도구'})).not.toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: '정지'}))
    expect(view.getByRole('group', {name: '디포머 편집 도구'})).toBeInTheDocument()
  })

  test('should hide selection actions for mixed node kinds', async () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))
    await waitForSelectionReady()
    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}), {ctrlKey: true})
    await waitForSelectionReady()

    expect(view.queryByRole('button', {name: '자동 메시'})).toBeNull()
    expect(view.queryByRole('button', {name: '컨테이너 해제'})).toBeNull()
  })

  test('should show only group actions and unwrap the selected group', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))
    await waitForSelectionReady()

    expect(view.queryByRole('button', {name: '자동 메시'})).toBeNull()
    expect(
      within(view.getByLabelText('레이어 계층 편집')).queryByRole('button', {
        name: '컨테이너 해제',
      }),
    ).toBeNull()
    fireEvent.click(view.getByRole('button', {name: '컨테이너 해제'}))

    await waitFor(() => {
      expect(onDocumentChange.mock.calls.at(-1)?.[0]?.scene?.roots.map(({id}) => id)).toEqual([
        'mesh-preview',
        'shape-circle',
        'shape-diamond',
      ])
    })
    expect(view.queryByRole('button', {name: '컨테이너 해제'})).toBeNull()
  })

  test('should export a valid document after unwrapping a parameter deformer', async () => {
    const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
    const deformerDocument = createDeformer(source, ['mesh-preview'])!
    const deformer = getDocumentScene(deformerDocument).roots[0]!
    const added = keyforms.createKeyedParameter({
      document: deformerDocument,
      nodeIds: [deformer.id],
    })!
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={added.document} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
    await waitForSelectionReady()
    fireEvent.click(view.getByRole('button', {name: '컨테이너 해제'}))

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      expect(document?.parameterBindings?.[0]).toMatchObject({
        keyforms: [{deformers: []}],
        targetDeformerIds: [],
      })
      expect(parseDocument(serializeDocument(document!)).ok).toBe(true)
    })
  })

  test('should convert a selected group to a deformer and back', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: 'Shapes 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })

    await waitFor(() => {
      expect(
        getDocumentScene(onDocumentChange.mock.calls.at(-1)![0]).roots.find(
          (node) => node.id === 'shapes',
        )?.kind,
      ).toBe('deformer')
    })
    expect(view.queryByRole('button', {name: '그룹으로 변경'})).toBeNull()
    expect(view.getByRole('spinbutton', {name: '격자 가로 칸'})).toBeVisible()

    fireEvent.keyDown(view.getByRole('button', {name: 'Shapes 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '일반 그룹'}), {key: 'Enter'})

    await waitFor(() => {
      expect(
        getDocumentScene(onDocumentChange.mock.calls.at(-1)![0]).roots.find(
          (node) => node.id === 'shapes',
        )?.kind,
      ).toBe('group')
    })
    expect(view.queryByRole('button', {name: '자유 변형 디포머로 변경'})).toBeNull()
    expect(view.queryByRole('spinbutton', {name: '격자 가로 칸'})).toBeNull()
  })

  test('should connect a clipping mask by picking a layer', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    await waitForSelectionReady()
    fireEvent.click(view.getByRole('button', {name: '레이어에서 선택'}))
    expect(view.getByRole('button', {name: '대상 선택 취소'})).toBeVisible()

    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))
    await waitForSelectionReady()

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0] as PuppetDocument | undefined
      expect(document?.parts.find((part) => part.id === 'shape-diamond')?.properties).toMatchObject(
        {
          clippingMaskIds: ['mesh-preview', 'shape-circle'],
        },
      )
    })
    expect(view.queryByRole('button', {name: '대상 선택 취소'})).toBeNull()
    expect(view.getByRole('button', {name: 'shape-circle 레이어 선택'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('should create and interpolate free-transform deformer parameter keyforms', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })
    fireEvent.click(view.getByRole('button', {name: '1차원 Parameter 추가'}))

    const track = view.getByLabelText('Parameter 3 키폼 트랙')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 200, 40))
    fireEvent.dblClick(track, {clientX: 200})
    const parameterValue = view.getByRole('spinbutton', {name: 'Parameter 3 값'})
    fireEvent.input(parameterValue, {target: {value: '30'}})
    fireEvent.dblClick(track, {clientX: 300})
    fireEvent.input(view.getByRole('spinbutton', {name: '자유 변형 각도'}), {
      target: {value: '60'},
    })
    fireEvent.input(view.getByRole('spinbutton', {name: 'Parameter 3 값'}), {
      target: {value: '15'},
    })

    await waitFor(() => {
      const document = onDocumentChange.mock.calls.at(-1)?.[0]
      const binding = document?.parameterBindings?.find(
        (candidate: {id: string}) => candidate.id === 'parameter-3',
      )
      const deformer = getDocumentScene(document).roots[0]
      const keyform = binding?.keyforms[1]?.deformers[0]
      expect(binding?.targetDeformerIds).toEqual(['group'])
      expect(keyform).toMatchObject({kind: 'deformer', nodeId: 'group'})
      expect(
        deformer?.kind === 'deformer' && keyform?.kind === 'deformer'
          ? getDeformerAngle({...deformer, controlPoints: keyform.controlPoints})
          : undefined,
      ).toBeCloseTo(60)
      expect(
        (view.getByRole('spinbutton', {name: '자유 변형 각도'}) as HTMLInputElement).valueAsNumber,
      ).toBeCloseTo(30)
    })
  })

  test('should edit a deformer before connecting it to a parameter', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)

    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })

    expect(view.queryByRole('status')).not.toBeInTheDocument()
    expect(view.queryByRole('spinbutton', {name: '격자 제어점 1 X'})).not.toBeInTheDocument()
    const angle = view.getByRole('spinbutton', {name: '자유 변형 각도'})
    expect(angle).toBeEnabled()
    fireEvent.input(angle, {target: {value: '15'}})
    expect(angle).toHaveValue(15)

    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}), {ctrlKey: true})
    await waitForSelectionReady()
    fireEvent.click(view.getByRole('button', {name: '선택 레이어 연결'}))
    fireEvent.click(view.getByRole('button', {name: '새 그룹 레이어 선택'}))
    await waitForSelectionReady()

    await waitFor(() => {
      expect(view.queryByRole('status')).not.toBeInTheDocument()
    })
    fireEvent(
      view.getByRole('button', {name: '격자 제어점 1'}),
      new MouseEvent('pointerdown', {bubbles: true}),
    )
    expect(view.getByRole('spinbutton', {name: '격자 제어점 1 X'})).toBeEnabled()

    fireEvent(
      view.getByRole('button', {name: '격자 제어점 2'}),
      new MouseEvent('pointerdown', {bubbles: true, ctrlKey: true}),
    )
    expect(view.getByRole('spinbutton', {name: '격자 제어점 1 X'})).toBeEnabled()
    expect(view.getByRole('spinbutton', {name: '격자 제어점 2 X'})).toBeEnabled()
  })

  test('should undo and redo curve knot insertion and deletion without changing topology from an input', async () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '곡선 디포머'}), {
      key: 'Enter',
    })
    expect(view.queryByLabelText('자유 변형 각도')).toBeNull()
    expect(view.queryByLabelText('자유 변형 회전 중심 X')).toBeNull()
    expect(view.queryByLabelText('자유 변형 회전 중심 Y')).toBeNull()
    const svg = view.getByLabelText('디포머 편집 영역')
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
    fireEvent.dblClick(view.getByLabelText('곡선 연결점 추가 영역'), {clientX: 320, clientY: 360})
    expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(7)
    const input = view.getByLabelText('곡선 제어점 4 X')
    fireEvent.keyDown(input, {key: 'Backspace'})
    expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(7)
    fireEvent.keyDown(svg, {key: 'Delete'})
    expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(4)
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z'})
    await waitFor(() =>
      expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(7),
    )
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z'})
    await waitFor(() =>
      expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(4),
    )
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z', shiftKey: true})
    await waitFor(() =>
      expect(view.getAllByRole('button', {name: /^곡선 (제어점|핸들) \d+$/})).toHaveLength(7),
    )
  })

  test('should create a bone deformer with its own controls and include joint edits in history', async () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '본 디포머'}), {key: 'Enter'})
    expect(view.queryByLabelText('자유 변형 각도')).toBeNull()
    expect(view.queryByLabelText('격자 가로 칸')).toBeNull()
    expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(2)
    fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
    const svg = view.getByLabelText('본 디포머 편집 영역')
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
    fireEvent.dblClick(svg, {clientX: 840, clientY: 430})
    expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(3)
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z'})
    await waitFor(() => expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(2))
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z', shiftKey: true})
    await waitFor(() => expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(3))
  })

  test('should preserve the posed mesh through inspector placement edits and undo redo', async () => {
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
    await waitForSelectionReady()
    fireEvent.keyDown(view.getByRole('button', {name: '새 그룹 종류 변경'}), {key: 'Enter'})
    fireEvent.keyDown(await screen.findByRole('menuitemradio', {name: '자유 변형 디포머'}), {
      key: 'Enter',
    })
    const latest = () => onDocumentChange.mock.calls.at(-1)![0] as PuppetDocument
    const node = () => getSceneNode(latest(), 'group') as PuppetSceneDeformerNode
    fireEvent.input(view.getByLabelText('자유 변형 각도'), {target: {value: '30'}})
    fireEvent.blur(view.getByLabelText('자유 변형 각도'))
    const before = node()
    const point = {x: 200, y: 100}
    const expected = transformDeformerPoint(before, point)
    fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
    fireEvent.input(view.getByLabelText('자유 변형 각도'), {target: {value: '60'}})
    fireEvent.blur(view.getByLabelText('자유 변형 각도'))
    expect(node().controlPoints).not.toEqual(before.controlPoints)
    expect(transformDeformerPoint(node(), point)).toEqual(expected)
    const placed = node()
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z'})
    expect(node()).toEqual(before)
    fireEvent.keyDown(globalThis.window, {ctrlKey: true, key: 'z', shiftKey: true})
    expect(node()).toEqual(placed)
    expect(parseDocument(serializeDocument(latest())).ok).toBe(true)
    fireEvent.click(view.getByRole('button', {name: '변형 편집'}))
    fireEvent.input(view.getByLabelText('자유 변형 각도'), {target: {value: '90'}})
    expect(transformDeformerPoint(node(), point)).not.toEqual(expected)
  })

  test('should retain the first glue endpoint when selecting another part in the layer panel', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor
        initialDocument={{
          ...createDemoDocument(),
          motions: [],
          parameterBindings: [],
          parameters: [],
        }}
      />
    ))
    const vertex = view.container.querySelector('[data-part-id="mesh-preview"] circle')!
    fireEvent(vertex, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
    fireEvent.click(view.getByRole('button', {name: '선택 정점에서 연결 시작'}))
    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))
    await waitForSelectionReady()
    expect(view.getByText(/A: mesh-preview · 정점 1/)).toBeVisible()
    const target = view.container.querySelector('[data-part-id="shape-diamond"] circle')!
    fireEvent(target, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
    fireEvent.click(view.getByRole('button', {name: '이 정점과 붙이기'}))
    expect(view.getByRole('spinbutton', {name: 'glue-1 붙임 강도'})).toHaveValue(100)
  })
})
