/** @vitest-environment jsdom */

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {useStudioTour} from '../use-tour'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.unstubAllGlobals()
})

describe('useStudioTour', () => {
  it('should use English copy and recordings for the English locale', () => {
    overwriteGetLocale(() => 'en')

    const view = renderHook(() => useStudioTour())
    const steps = view.result.steps()

    expect(steps[0]).toMatchObject({
      description: 'Set your focus and break times, then start the timer.',
      title: 'Pomodoro timer',
    })
    expect(steps.flatMap((step) => (step.video === undefined ? [] : [step.video.source]))).toEqual([
      '/tour/en/pomodoro-control.webm',
      '/tour/en/pomodoro-detail.webm',
      '/tour/en/pomodoro-duration.webm',
      '/tour/en/add-album.webm',
      '/tour/en/expand-player.webm',
      '/tour/en/memory-assist-sentences.webm',
      '/tour/en/memory-assist-words.webm',
      '/tour/en/memory-assist-memos.webm',
      '/tour/en/memory-assist-picture-diary.webm',
      '/tour/en/memory-assist-calendar.webm',
      '/tour/en/settings-general.webm',
      '/tour/en/settings-events.webm',
      '/tour/en/settings-feeds.webm',
      '/tour/en/settings-dialogue.webm',
      '/tour/en/settings-user.webm',
    ])
    expect(steps.every((step) => step.audio === undefined)).toBe(true)
    expect(steps.filter((step) => step.id.startsWith('memory-assist-'))).toMatchObject([
      {
        description:
          'Choose a learning language, create sentences, and listen to saved sentences in dialogue.',
        id: 'memory-assist-sentences',
        title: 'Learning sentences',
        video: {
          label: 'How to review saved sentences in Learning sentences',
          source: '/tour/en/memory-assist-sentences.webm',
        },
      },
      {
        description:
          'Save unfamiliar words with commas or Enter, listen to pronunciations, and mark words as memorized.',
        id: 'memory-assist-words',
        title: 'Learning words',
        video: {
          label: 'How to save learning words and track memorized words',
          source: '/tour/en/memory-assist-words.webm',
        },
      },
      {
        description:
          'Save something to remember and set a date-and-time reminder or ongoing memory reminders.',
        id: 'memory-assist-memos',
        title: 'Memos',
        video: {
          label: 'How to save a memo and set reminders',
          source: '/tour/en/memory-assist-memos.webm',
        },
      },
      {
        description:
          'Draw a picture, write what you want to remember about today, and save it to this device.',
        id: 'memory-assist-picture-diary',
        title: 'Diary',
        video: {
          label: 'How to save a drawing and note in your diary',
          source: '/tour/en/memory-assist-picture-diary.webm',
        },
      },
      {
        description:
          'Review connected calendar events by month. Pomofi reads only the time range needed for a question.',
        id: 'memory-assist-calendar',
        title: 'Calendar',
        video: {
          label: 'How to connect a calendar and review events by month',
          source: '/tour/en/memory-assist-calendar.webm',
        },
      },
    ])
    expect(steps.find((step) => step.id === 'settings')).toMatchObject({
      description:
        'Configure scenes, display, events, feeds, dialogue, user information, and more across Pomofi.',
      title: 'Settings',
    })
    expect(steps.filter((step) => step.id.startsWith('settings-'))).toMatchObject([
      {
        description:
          'In General, set the language and theme, then adjust the scene, style, weather, and display options.',
        id: 'settings-general',
        title: 'General',
        video: {
          label: 'How to configure the basic environment in General',
          source: '/tour/en/settings-general.webm',
        },
      },
      {
        description:
          'In Events, connect dialogue to Pomofi entry and focus or break ' +
          'transitions, and set the random event interval.',
        id: 'settings-events',
        title: 'Events',
        video: {
          label: 'How to connect dialogue events in Events',
          source: '/tour/en/settings-events.webm',
        },
      },
      {
        description:
          'In Feeds, add RSS or Atom feeds, choose a voice for new posts, and manage saved feeds.',
        id: 'settings-feeds',
        title: 'Feeds',
        video: {
          label: 'How to add and manage feeds in Feeds',
          source: '/tour/en/settings-feeds.webm',
        },
      },
      {
        description:
          'In Dialogue, create dialogues and set the automatic voice model, voice, and music volume during dialogue.',
        id: 'settings-dialogue',
        title: 'Dialogue',
        video: {
          label: 'How to manage dialogue and voice settings in Dialogue',
          source: '/tour/en/settings-dialogue.webm',
        },
      },
      {
        description:
          'In User, check your sign-in status and account information, and open ' +
          'account management and service policies.',
        id: 'settings-user',
        title: 'User',
        video: {
          label: 'How to check account information in User',
          source: '/tour/en/settings-user.webm',
        },
      },
    ])
    expect(steps.some((step) => step.id === 'settings-guide')).toBe(false)
    expect(steps.some((step) => step.id === 'settings-credits')).toBe(false)
  })

  it('should use bundled Korean narration for the Korean locale', () => {
    overwriteGetLocale(() => 'ko')

    const view = renderHook(() => useStudioTour())
    const steps = view.result.steps()

    expect(steps.find((step) => step.id === 'memory-assist-calendar')).toMatchObject({
      description: '캘린더 일정을 월별로 확인하고, 지정된 일정을 말로 알려줘요.',
    })
    expect(steps.map((step) => step.audio?.source)).toEqual([
      '/tour/audio/ko/pomodoro.mp3',
      '/tour/audio/ko/pomodoro-control.mp3',
      '/tour/audio/ko/pomodoro-detail.mp3',
      '/tour/audio/ko/pomodoro-duration.mp3',
      '/tour/audio/ko/music.mp3',
      '/tour/audio/ko/music-album.mp3',
      '/tour/audio/ko/music-expand.mp3',
      '/tour/audio/ko/memory-assist.mp3',
      '/tour/audio/ko/memory-assist-sentences.mp3',
      '/tour/audio/ko/memory-assist-words.mp3',
      '/tour/audio/ko/memory-assist-memos.mp3',
      '/tour/audio/ko/memory-assist-picture-diary.mp3',
      '/tour/audio/ko/memory-assist-calendar.mp3',
      '/tour/audio/ko/settings.mp3',
      '/tour/audio/ko/settings-general.mp3',
      '/tour/audio/ko/settings-events.mp3',
      '/tour/audio/ko/settings-feeds.mp3',
      '/tour/audio/ko/settings-dialogue.mp3',
      '/tour/audio/ko/settings-user.mp3',
    ])
    expect(steps.filter((step) => step.id.startsWith('settings-'))).toMatchObject([
      {
        description:
          '일반 탭에서 언어와 테마부터 장면·스타일·날씨·화면 유지까지 기본 환경을 설정할 수 있어요.',
        id: 'settings-general',
        title: '일반',
        video: {
          label: '일반 탭에서 기본 환경을 설정하는 방법',
          source: '/tour/settings-general.webm',
        },
      },
      {
        description:
          '이벤트 탭에서 앱입장과 집중·휴식의 시작·종료에 재생할 대화를 연결하고, 랜덤 이벤트 간격도 설정할 수 있어요.',
        id: 'settings-events',
        title: '이벤트',
        video: {
          label: '이벤트 탭에서 대화 이벤트를 연결하는 방법',
          source: '/tour/settings-events.webm',
        },
      },
      {
        description:
          '피드 탭에서 피드를 추가하고, 새 글을 읽을 목소리와 저장된 피드를 관리할 수 있어요.',
        id: 'settings-feeds',
        title: '피드',
        video: {
          label: '피드 탭에서 피드를 추가하고 관리하는 방법',
          source: '/tour/settings-feeds.webm',
        },
      },
      {
        description:
          '대화 탭에서 대화를 만들고, 자동 음성 모델과 목소리, 대화 중 음악 음량을 설정할 수 있어요.',
        id: 'settings-dialogue',
        title: '대화',
        video: {
          label: '대화 탭에서 대화와 음성 설정을 관리하는 방법',
          source: '/tour/settings-dialogue.webm',
        },
      },
      {
        description:
          '사용자 탭에서 로그인 상태와 계정 정보를 확인하고, 서비스 정책과 계정 관리로 이동할 수 있어요.',
        id: 'settings-user',
        title: '사용자',
        video: {
          label: '사용자 탭에서 계정 정보를 확인하는 방법',
          source: '/tour/settings-user.webm',
        },
      },
    ])
    expect(steps.some((step) => step.id === 'settings-guide')).toBe(false)
    expect(steps.some((step) => step.id === 'settings-credits')).toBe(false)
  })

  it('should play the active Korean narration when the tour starts', () => {
    overwriteGetLocale(() => 'ko')
    class AudioMock {
      static lastInstance: AudioMock | undefined

      currentTime = 0
      load = vi.fn()
      pause = vi.fn()
      play = vi.fn().mockResolvedValue(undefined)
      removeAttribute = vi.fn()
      source: string

      constructor(source: string) {
        this.source = source
        AudioMock.lastInstance = this
      }
    }
    vi.stubGlobal('Audio', AudioMock)

    const view = renderHook(() => useStudioTour())
    const step = view.result.steps()[0]!

    view.result.onEvent({activeElement: null, step, type: 'started'})

    expect(AudioMock.lastInstance?.source).toBe('/tour/audio/ko/pomodoro.mp3')
    expect(AudioMock.lastInstance?.play).toHaveBeenCalledOnce()
  })
})
