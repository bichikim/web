/** @vitest-environment jsdom */

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
} from '../../player'
import {transformDeformerPoint} from '../../deformation'
import {getDeformerAngle} from '../internal/deformer-transform'
import {addParameter} from '../internal/parameter-keyforms'
import {createDeformer, getSceneNode} from '../internal/scene-graph'
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
  playMotion: vi.fn(() => true),
  redraw: vi.fn(),
  resetPhysics: vi.fn(),
  resize: vi.fn(),
  seek: vi.fn(),
  setMotion: vi.fn(() => true),
  setParameterValues: vi.fn(),
  setPhysicsPreview: vi.fn(),
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
  test('should hide selection actions for mixed node kinds', () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))
    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}), {ctrlKey: true})

    expect(view.queryByRole('button', {name: '자동 메시'})).toBeNull()
    expect(view.queryByRole('button', {name: '컨테이너 해제'})).toBeNull()
  })

  test('should show only group actions and unwrap the selected group', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'Shapes 레이어 선택'}))

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
    const added = addParameter({document: deformerDocument, nodeIds: [deformer.id]})!
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={added.document} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: '새 자유 변형 디포머 레이어 선택'}))
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

  test('should connect a clipping mask by picking a layer', async () => {
    const onDocumentChange = vi.fn()
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))

    fireEvent.click(view.getByRole('button', {name: 'shape-circle 레이어 선택'}))
    fireEvent.click(view.getByRole('button', {name: '레이어에서 선택'}))
    expect(view.getByRole('button', {name: '대상 선택 취소'})).toBeVisible()

    fireEvent.click(view.getByRole('button', {name: 'shape-diamond 레이어 선택'}))

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

  test('should create a bone deformer with its own controls and include joint edits in history', async () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
    fireEvent.click(view.getByRole('button', {name: '그룹'}))
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
    fireEvent.click(screen.getByRole('button', {name: '실행 취소'}))
    await waitFor(() => expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(2))
    fireEvent.click(screen.getByRole('button', {name: '다시 실행'}))
    await waitFor(() => expect(view.getAllByRole('button', {name: /본 관절/})).toHaveLength(3))
  })

  test('should retain the first glue endpoint when selecting another part in the layer panel', () => {
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
    expect(view.getByText(/A: mesh-preview · 정점 1/)).toBeVisible()
    const target = view.container.querySelector('[data-part-id="shape-diamond"] circle')!
    fireEvent(target, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
    fireEvent.click(view.getByRole('button', {name: '이 정점과 붙이기'}))
    expect(view.getByRole('spinbutton', {name: 'glue-1 붙임 강도'})).toHaveValue(100)
  })
})
