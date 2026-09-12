/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {fireEvent, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {configureStudio, renderStudio, setupStudio, studioMocks} from './p-studio/setup'

const {
  DEFAULT_BACKGROUND,
  PTour,
  SceneToolbar,
  readFocusRoomEntrySession,
  useBackground,
  usePDisplayPreferences,
  writeFocusRoomEntrySession,
} = studioMocks

const expectTourStepTargets = (
  tourProps: Parameters<typeof PTour>[0],
  stepIds: readonly string[],
  expectedStep: string,
) => {
  for (const stepId of stepIds) {
    expect(tourProps.getStepElement(stepId)).toHaveAttribute('data-tour-step', expectedStep)
  }
}

beforeEach(setupStudio)
afterEach(() => {
  vi.useRealTimers()
})

describe('PStudio', () => {
  it.each([false, true])(
    'should wait for display restoration before mounting the toolbar with visibility %s',
    (visible) => {
      configureStudio({entrySession: true})
      const preferences = vi.mocked(usePDisplayPreferences)()
      const [isReady, setIsReady] = createSignal(false)
      const [visibility, setVisibility] = createSignal(true)
      vi.mocked(usePDisplayPreferences).mockReturnValue({
        ...preferences,
        isReady,
        memoryAssistVisible: visibility,
        toolsButtonVisible: visibility,
        tourButtonVisible: visibility,
      })

      renderStudio()

      expect(SceneToolbar).not.toHaveBeenCalled()
      setVisibility(visible)
      expect(SceneToolbar).not.toHaveBeenCalled()
      setIsReady(true)

      expect(SceneToolbar).toHaveBeenCalledOnce()
      const toolbar = vi.mocked(SceneToolbar).mock.calls[0][0]
      expect(toolbar.memoryAssistVisible).toBe(visible)
      expect(toolbar.toolsButtonVisible).toBe(visible)
      expect(toolbar.tourButtonVisible).toBe(visible)

      setVisibility(!visible)
      expect(toolbar.memoryAssistVisible).toBe(!visible)
      expect(toolbar.toolsButtonVisible).toBe(!visible)
      expect(toolbar.tourButtonVisible).toBe(!visible)
    },
  )

  it('should enter the focus room and pass toolbar changes to the scene', () => {
    configureStudio({gyroscope: true, isScreenSaverActive: true})

    renderStudio()

    expect(screen.getByText('장면 대기')).toBeInTheDocument()
    expect(screen.getByRole('img', {name: 'day-reading-focused'})).toBeInTheDocument()
    expect(screen.queryByText('이벤트')).not.toBeInTheDocument()
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'gyroscope',
    )

    fireEvent.click(screen.getByRole('button', {name: '장면 로드 완료'}))
    expect(screen.queryByText('장면 대기')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '입장'}))
    fireEvent.click(screen.getByRole('button', {name: '입장'}))
    fireEvent.click(screen.getByRole('button', {name: '입장 화면 닫기'}))
    expect(writeFocusRoomEntrySession).toHaveBeenCalledTimes(2)
    expect(screen.getByText('이벤트')).toBeInTheDocument()
    expect(screen.getByText('이벤트')).toHaveAttribute('data-dialogue-composer-visible', 'false')

    fireEvent.click(screen.getByRole('button', {name: '글쓰기'}))
    fireEvent.click(screen.getByRole('button', {name: '사용자 보기'}))
    fireEvent.click(screen.getByRole('button', {name: '대화 입력 표시'}))
    fireEvent.click(screen.getByRole('button', {name: '드래그'}))
    fireEvent.click(screen.getByRole('button', {name: '평면'}))
    fireEvent.click(screen.getByRole('button', {name: '낙서'}))
    fireEvent.click(screen.getByRole('button', {name: '자동 시간'}))
    fireEvent.click(screen.getByRole('button', {name: '날씨 켜기'}))
    fireEvent.click(screen.getByRole('button', {name: '서울'}))
    fireEvent.click(screen.getByRole('button', {name: '비 장면'}))
    fireEvent.click(screen.getByRole('button', {name: '장면 다시 로드'}))

    expect(screen.getByRole('img', {name: 'night-writing-user'})).toBeInTheDocument()
    expect(screen.getByText('이벤트')).toHaveAttribute('data-dialogue-composer-visible', 'true')
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute('data-time', 'night')
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute('data-weather', 'rain')
    expect(screen.getByText('장면 로드 완료').parentElement).toHaveAttribute(
      'data-motion-input',
      'drag',
    )
    expect(document.querySelector('[data-transitioning]')).toHaveAttribute(
      'data-transitioning',
      'true',
    )
  })

  it('should open the studio tour and resolve every target inside the studio', () => {
    configureStudio({entrySession: true})

    renderStudio()
    fireEvent.click(screen.getByRole('button', {name: '둘러보기'}))

    expect(screen.getByText('투어')).toHaveAttribute('data-open', 'true')
    const tourProps = vi.mocked(PTour).mock.calls.at(-1)?.[0]
    expect(tourProps).toBeDefined()
    if (!tourProps) {
      return
    }

    expect(tourProps.steps.map((step) => step.id)).toEqual([
      'pomodoro',
      'pomodoro-control',
      'pomodoro-detail',
      'pomodoro-duration',
      'music',
      'music-album',
      'music-expand',
      'memory-assist',
      'memory-assist-sentences',
      'memory-assist-words',
      'memory-assist-memos',
      'memory-assist-picture-diary',
      'memory-assist-calendar',
      'settings',
      'settings-general',
      'settings-background',
      'settings-events',
      'settings-feeds',
      'settings-dialogue',
      'settings-user',
      'completion',
    ])
    expect(tourProps.steps.at(-1)).toMatchObject({
      audio: {source: '/tour/audio/ko/completion.mp3'},
      description: '투어가 끝났어요. 이제 앱을 편하게 즐겨보세요!',
      id: 'completion',
      title: '이제 시작해 볼까요?',
    })
    expect(tourProps.getStepElement('completion')).toBeNull()
    expect(tourProps.steps[1]).toMatchObject({
      title: '포모도로 타이머',
      video: {source: '/tour/pomodoro-control.webm'},
    })
    expect(tourProps.steps[2]).toMatchObject({
      title: '포모도로 타이머',
      video: {source: '/tour/pomodoro-detail.webm'},
    })
    expect(tourProps.steps[3]).toMatchObject({
      title: '포모도로 타이머',
      video: {source: '/tour/pomodoro-duration.webm'},
    })
    expect(tourProps.steps[5]).toMatchObject({
      title: '집중 음악',
      video: {source: '/tour/add-album.webm'},
    })
    expect(tourProps.steps[6]).toMatchObject({
      title: '집중 음악',
      video: {source: '/tour/expand-player.webm'},
    })
    expect(tourProps.steps.find((step) => step.id === 'settings')).toMatchObject({
      description:
        '장면과 화면부터 이벤트, 피드, 대화, 사용자 정보까지 앱의 다양한 기능을 설정할 수 있어요.',
      title: '설정',
    })
    expect(tourProps.getStepElement('pomodoro')).toHaveClass('pomo-pomodoro')
    expect(tourProps.getStepElement('pomodoro-control')).toHaveClass('pomo-pomodoro')
    expect(tourProps.getStepElement('pomodoro-detail')).toHaveClass('pomo-pomodoro')
    expect(tourProps.getStepElement('pomodoro-duration')).toHaveClass('pomo-pomodoro')
    expect(tourProps.getStepElement('music')).toHaveClass('pomo-player-stage')
    expect(tourProps.getStepElement('music-album')).toHaveClass('pomo-player-stage')
    expect(tourProps.getStepElement('music-expand')).toHaveClass('pomo-player-stage')
    expectTourStepTargets(
      tourProps,
      [
        'memory-assist',
        'memory-assist-sentences',
        'memory-assist-words',
        'memory-assist-memos',
        'memory-assist-picture-diary',
        'memory-assist-calendar',
      ],
      'memory-assist',
    )
    expectTourStepTargets(
      tourProps,
      [
        'settings',
        'settings-general',
        'settings-background',
        'settings-events',
        'settings-feeds',
        'settings-dialogue',
        'settings-user',
      ],
      'settings',
    )
    expect(tourProps.getStepElement('unknown')).toBeNull()
  })

  it('should show the tour hint after a first entry and hide it when the tour opens', async () => {
    localStorage.removeItem('pomo:focus-room-entry-history:v1')
    renderStudio()

    fireEvent.click(screen.getByRole('button', {name: '입장'}))
    expect(screen.queryByText('첫 입장 투어 안내')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: '입장 화면 닫기'}))
    await waitFor(() => expect(screen.getByText('첫 입장 투어 안내')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', {name: '둘러보기'}))
    expect(screen.queryByText('첫 입장 투어 안내')).not.toBeInTheDocument()
    expect(screen.getByText('투어')).toHaveAttribute('data-open', 'true')
  })

  it('should restore a stored entry session without creating the scene before preferences are ready', () => {
    configureStudio({entrySession: true, isReady: false, styleReady: false})

    renderStudio()

    expect(readFocusRoomEntrySession).toHaveBeenCalled()
    expect(screen.getByText('이벤트')).toBeInTheDocument()
    expect(screen.queryByText('입장')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', {name: '장면 로드 완료'})).not.toBeInTheDocument()
    expect(SceneToolbar).not.toHaveBeenCalled()
  })
})

it('should unmount the character scene in frame mode while keeping the timer and controls', () => {
  configureStudio({entrySession: true})
  const [preferences, setPreferences] = createSignal(DEFAULT_BACKGROUND)
  const background = vi.mocked(useBackground)()
  vi.mocked(useBackground).mockReturnValue({...background, preferences})
  renderStudio()
  expect(screen.getByRole('img')).toBeInTheDocument()
  setPreferences({...DEFAULT_BACKGROUND, mode: 'frame'})
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText('frame player')).toBeInTheDocument()
  expect(screen.getByText('포모도로')).toBeInTheDocument()
  expect(screen.getByText('음악')).toBeInTheDocument()
  setPreferences(DEFAULT_BACKGROUND)
  expect(screen.getByRole('img')).toBeInTheDocument()
  expect(screen.queryByText('frame player')).not.toBeInTheDocument()
})
