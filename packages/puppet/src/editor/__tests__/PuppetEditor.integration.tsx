/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type Player,
  type PlayerPlaybackOptions,
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
const playMotion = vi.fn<(motionId: string, options?: PlayerPlaybackOptions) => boolean>(() => true)
const player: Player = {
  destroy: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playMotion,
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
  test('should control live physics without changing the document or playback', async () => {
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
    await waitFor(() => expect(player.setPhysicsPreview).toHaveBeenLastCalledWith(true))
    const documentChanges = onDocumentChange.mock.calls.length
    fireEvent.click(view.getByRole('button', {name: '모든 파라미터 보기'}))
    fireEvent.click(view.getByRole('button', {name: '물리 미리보기'}))
    expect(player.setPhysicsPreview).toHaveBeenLastCalledWith(false)
    fireEvent.click(view.getByRole('button', {name: '물리 초기화'}))
    expect(player.resetPhysics).toHaveBeenCalledOnce()
    expect(player.play).not.toHaveBeenCalled()
    expect(onDocumentChange).toHaveBeenCalledTimes(documentChanges)
  })

  test('should leave mesh editing when the part selection is cleared', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={{...createDemoDocument(), motions: []}} />
    ))
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalled())
    expect(view.getByRole('group', {name: '메시 편집'})).toContainElement(
      view.getByRole('group', {name: '정점 편집 방식'}),
    )
    expect(view.container.querySelector('.viewport-tools')).not.toContainElement(
      view.getByRole('group', {name: '정점 편집 방식'}),
    )
    fireEvent.click(view.getByRole('button', {name: '기준 배치'}))
    expect(view.getByRole('button', {name: '기준 배치'})).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(view.container.querySelector('.layer-scroll')!)
    fireEvent.click(view.getByRole('button', {name: 'mesh-preview 레이어 선택'}))
    expect(view.getByRole('button', {name: '키폼 변형'})).toHaveAttribute('aria-pressed', 'true')
  })

  test('should render the editor workspace and initialize its player', async () => {
    mocks.createPlayer.mockResolvedValue(player)

    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)

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
    expect(view.queryByRole('button', {name: 'idle-deform 이벤트 실행'})).not.toBeInTheDocument()
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

    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    await waitFor(() => screen.getByRole('option', {name: '모든 타임라인 보기'}))
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})
    const blinkSeek = view.getByRole('slider', {name: 'blink 재생 위치'})
    fireEvent.focus(blinkSeek)
    fireEvent.keyDown(blinkSeek, {key: 'End'})

    expect(player.setMotion).toHaveBeenLastCalledWith('blink')
    expect(player.seek).toHaveBeenLastCalledWith(0.4)
  })

  test('should edit mesh topology only from the modeling workspace and include it in history', async () => {
    const onDocumentChange = vi.fn<(document: PuppetDocument) => void>()
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={onDocumentChange} />
    ))
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
})
