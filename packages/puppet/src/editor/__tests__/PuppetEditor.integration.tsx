/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../player'
import {PuppetEditor} from '../PuppetEditor'
import {createPlayerFixture} from './fixtures/player'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
const player = createPlayerFixture()

vi.mock('../../player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
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

  test('should start with an empty layer document by default', async () => {
    const view = render(() => <PuppetEditor />)

    expect(view.getByText('PNG를 불러오세요.')).toBeVisible()
    expect(view.getByText('Parameter를 추가하세요.')).toBeVisible()
    expect(view.queryByRole('tree', {name: '모델 레이어'})).not.toBeInTheDocument()
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    expect(mocks.createPlayer.mock.calls[0]?.[0].document.parts).toHaveLength(0)
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

  test('should keep mesh target and tool choices together without visible group labels', () => {
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
    const toolbar = view.getByRole('group', {name: '메시 편집'})

    expect(within(toolbar).getByRole('group', {name: '정점 편집 방식'})).toBeInTheDocument()
    expect(within(toolbar).getByRole('group', {name: '편집 도구'})).toBeInTheDocument()
    expect(within(toolbar).getByRole('button', {name: '키폼 변형'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(toolbar).getByRole('button', {name: '정점 선택·이동'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(within(toolbar).getByRole('button', {name: '기준 배치'}))
    fireEvent.click(within(toolbar).getByRole('button', {name: '변형 브러시'}))
    expect(within(toolbar).getByRole('button', {name: '기준 배치'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(toolbar).getByRole('button', {name: '변형 브러시'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(view.queryByText('편집 대상')).not.toBeInTheDocument()
    expect(view.queryByText('도구')).not.toBeInTheDocument()
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
              axis: 'x',
              keyframes: [{time: 0, value: 0}],
              kind: 'vertex',
              partId: 'mesh-preview',
              vertexIndex: 0,
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

  test('should initialize the requested animation workspace and motion', async () => {
    const view = render(() => (
      <PuppetEditor
        initialDocument={createDemoDocument()}
        initialMotionId="blink"
        initialWorkspace="animation"
      />
    ))

    expect(view.getByRole('button', {name: '애니메이션'})).toHaveAttribute('aria-pressed', 'true')
    expect(view.getByRole('button', {name: '모션 선택 blink'})).toBeVisible()
    expect(view.getByRole('region', {name: 'Timeline'})).toBeVisible()
  })

  test('should hold editing geometry during playback and catch up when paused', async () => {
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} initialWorkspace="animation" />
    ))
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    const onFrame = mocks.createPlayer.mock.calls[0]?.[0].onFrame
    const vertex = () =>
      view.container.querySelectorAll('[data-part-id="mesh-preview"] circle')[4]?.getAttribute('cy')
    const overlays = view.container.querySelector('.editing-overlays')
    expect(view.getByRole('group', {name: '표시 설정'})).toBeInTheDocument()
    onFrame?.({duration: 2, motionId: 'idle-deform', time: 0.5})
    const startPosition = vertex()

    fireEvent.click(view.getByRole('button', {name: '재생'}))
    onFrame?.({duration: 2, motionId: 'idle-deform', time: 1})

    expect(view.getByRole('slider', {name: '재생 위치'})).toHaveAttribute('aria-valuenow', '1')
    expect(vertex()).toBe(startPosition)
    expect(overlays).toHaveAttribute('aria-hidden', 'true')
    expect(overlays).toHaveProperty('inert', true)
    expect(view.queryByRole('group', {name: '표시 설정'})).not.toBeInTheDocument()

    fireEvent.click(view.getByRole('button', {name: '정지'}))
    expect(vertex()).toBe('176')
    expect(overlays).toHaveAttribute('aria-hidden', 'false')
    expect(overlays).toHaveProperty('inert', false)
    expect(view.getByRole('group', {name: '표시 설정'})).toBeInTheDocument()
  })

  test('should toggle the left, right, and bottom editor panels from the toolbar', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
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

  test('should notify only document changes through the latest external callback', async () => {
    const [external, setExternal] = createSignal(0)
    const firstCallback = vi.fn(() => external())
    const secondCallback = vi.fn()
    const [listener, setListener] = createSignal({callback: firstCallback})
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => (
      <PuppetEditor initialDocument={createDemoDocument()} onDocumentChange={listener().callback} />
    ))

    await waitFor(() => expect(firstCallback).toHaveBeenCalledOnce())
    setExternal(1)
    expect(firstCallback).toHaveBeenCalledOnce()
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

  test('should hide editing overlays without resetting the canvas or selection', async () => {
    mocks.createPlayer.mockResolvedValue(player)
    const view = render(() => <PuppetEditor initialDocument={createDemoDocument()} />)
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
