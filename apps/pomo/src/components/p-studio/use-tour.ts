import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {createMemo, createSignal, onCleanup} from 'solid-js'

import {createFocusRoomTourAudioPlayer} from '../../features/focus-room-tour-audio'
import type {TourEvent} from '@winter-love/solid-use/tour'
import type {PTourStep} from '../tour/PTour'

const STEP_SELECTORS: Readonly<Record<string, string>> = {
  'memory-assist': '[data-tour-step="memory-assist"]',
  'memory-assist-calendar': '[data-tour-step="memory-assist"]',
  'memory-assist-memos': '[data-tour-step="memory-assist"]',
  'memory-assist-picture-diary': '[data-tour-step="memory-assist"]',
  'memory-assist-sentences': '[data-tour-step="memory-assist"]',
  'memory-assist-words': '[data-tour-step="memory-assist"]',
  music: '.pomo-player-stage',
  'music-album': '.pomo-player-stage',
  'music-expand': '.pomo-player-stage',
  pomodoro: '.pomo-pomodoro',
  'pomodoro-control': '.pomo-pomodoro',
  'pomodoro-detail': '.pomo-pomodoro',
  'pomodoro-duration': '.pomo-pomodoro',
  settings: '[data-tour-step="settings"]',
  'settings-background': '[data-tour-step="settings"]',
  'settings-dialogue': '[data-tour-step="settings"]',
  'settings-events': '[data-tour-step="settings"]',
  'settings-feeds': '[data-tour-step="settings"]',
  'settings-general': '[data-tour-step="settings"]',
  'settings-user': '[data-tour-step="settings"]',
}

const resolveCurrentAudioSource = (source: string): string => {
  const documentLocale = document.documentElement.lang
  const locale = documentLocale === 'en' || documentLocale === 'ko' ? documentLocale : getLocale()

  return source.replace(/^\/tour\/audio\/(?:ko|en)\//u, `/tour/audio/${locale}/`)
}

const createMemoryAssistTourSteps = (
  getAudio: (stepId: string) => {readonly source: string} | undefined,
  videoDirectory: string,
): ReadonlyArray<PTourStep> =>
  [
    {
      audio: getAudio('memory-assist-sentences'),
      description: m.tour_memory_assist_sentences_description(),
      id: 'memory-assist-sentences',
      scrollIntoView: true,
      title: m.tour_memory_assist_sentences_title(),
      video: {
        label: m.tour_memory_assist_sentences_video_label(),
        source: `${videoDirectory}/memory-assist-sentences.webm`,
      },
    },
    {
      audio: getAudio('memory-assist-words'),
      description: m.tour_memory_assist_words_description(),
      id: 'memory-assist-words',
      scrollIntoView: true,
      title: m.tour_memory_assist_words_title(),
      video: {
        label: m.tour_memory_assist_words_video_label(),
        source: `${videoDirectory}/memory-assist-words.webm`,
      },
    },
    {
      audio: getAudio('memory-assist-memos'),
      description: m.tour_memory_assist_memos_description(),
      id: 'memory-assist-memos',
      scrollIntoView: true,
      title: m.tour_memory_assist_memos_title(),
      video: {
        label: m.tour_memory_assist_memos_video_label(),
        source: `${videoDirectory}/memory-assist-memos.webm`,
      },
    },
    {
      audio: getAudio('memory-assist-picture-diary'),
      description: m.tour_memory_assist_picture_diary_description(),
      id: 'memory-assist-picture-diary',
      scrollIntoView: true,
      title: m.tour_memory_assist_picture_diary_title(),
      video: {
        label: m.tour_memory_assist_picture_diary_video_label(),
        source: `${videoDirectory}/memory-assist-picture-diary.webm`,
      },
    },
    {
      audio: getAudio('memory-assist-calendar'),
      description: m.tour_memory_assist_calendar_description(),
      id: 'memory-assist-calendar',
      scrollIntoView: true,
      title: m.tour_memory_assist_calendar_title(),
      video: {
        label: m.tour_memory_assist_calendar_video_label(),
        source: `${videoDirectory}/memory-assist-calendar.webm`,
      },
    },
  ] satisfies ReadonlyArray<PTourStep>

const createSettingsTourSteps = (
  getAudio: (stepId: string) => {readonly source: string} | undefined,
  videoDirectory: string,
): ReadonlyArray<PTourStep> =>
  [
    {
      audio: getAudio('settings-general'),
      description: m.tour_settings_general_description(),
      id: 'settings-general',
      scrollIntoView: true,
      title: m.settings_tab_general(),
      video: {
        label: m.tour_settings_general_video_label(),
        source: `${videoDirectory}/settings-general.webm`,
      },
    },
    {
      audio: getAudio('settings-background'),
      description: m.tour_settings_background_description(),
      id: 'settings-background',
      scrollIntoView: true,
      title: m.settings_tab_background(),
      video: {
        label: m.tour_settings_background_video_label(),
        source: `${videoDirectory}/settings-background.webm`,
      },
    },
    {
      audio: getAudio('settings-events'),
      description: m.tour_settings_events_description(),
      id: 'settings-events',
      scrollIntoView: true,
      title: m.settings_tab_events(),
      video: {
        label: m.tour_settings_events_video_label(),
        source: `${videoDirectory}/settings-events.webm`,
      },
    },
    {
      audio: getAudio('settings-feeds'),
      description: m.tour_settings_feeds_description(),
      id: 'settings-feeds',
      scrollIntoView: true,
      title: m.settings_tab_feeds(),
      video: {
        label: m.tour_settings_feeds_video_label(),
        source: `${videoDirectory}/settings-feeds.webm`,
      },
    },
    {
      audio: getAudio('settings-dialogue'),
      description: m.tour_settings_dialogue_description(),
      id: 'settings-dialogue',
      scrollIntoView: true,
      title: m.settings_tab_dialogue(),
      video: {
        label: m.tour_settings_dialogue_video_label(),
        source: `${videoDirectory}/settings-dialogue.webm`,
      },
    },
    {
      audio: getAudio('settings-user'),
      description: m.tour_settings_user_description(),
      id: 'settings-user',
      scrollIntoView: true,
      title: m.settings_tab_user(),
      video: {
        label: m.tour_settings_user_video_label(),
        source: `${videoDirectory}/settings-user.webm`,
      },
    },
  ] satisfies ReadonlyArray<PTourStep>

export const useStudioTour = () => {
  const locale = getLocale()
  const videoDirectory = locale === 'en' ? '/tour/en' : '/tour'
  const audioDirectory = `/tour/audio/${locale}`
  const [isOpen, setIsOpen] = createSignal(false)
  const [studioElement, setStudioElement] = createSignal<HTMLElement | null>(null)
  const audioPlayer = createFocusRoomTourAudioPlayer()
  const getAudio = (stepId: string) => ({source: `${audioDirectory}/${stepId}.mp3`})
  const steps = createMemo(
    () =>
      [
        {
          audio: getAudio('pomodoro'),
          description: m.tour_pomodoro_description(),
          id: 'pomodoro',
          scrollIntoView: true,
          title: m.tour_pomodoro_title(),
        },
        {
          audio: getAudio('pomodoro-control'),
          description: m.tour_pomodoro_control_description(),
          id: 'pomodoro-control',
          scrollIntoView: true,
          title: m.tour_pomodoro_title(),
          video: {
            label: m.tour_pomodoro_control_video_label(),
            source: `${videoDirectory}/pomodoro-control.webm`,
          },
        },
        {
          audio: getAudio('pomodoro-detail'),
          description: m.tour_pomodoro_detail_description(),
          id: 'pomodoro-detail',
          scrollIntoView: true,
          title: m.tour_pomodoro_title(),
          video: {
            label: m.tour_pomodoro_detail_video_label(),
            source: `${videoDirectory}/pomodoro-detail.webm`,
          },
        },
        {
          audio: getAudio('pomodoro-duration'),
          description: m.tour_pomodoro_duration_description(),
          id: 'pomodoro-duration',
          scrollIntoView: true,
          title: m.tour_pomodoro_title(),
          video: {
            label: m.tour_pomodoro_duration_video_label(),
            source: `${videoDirectory}/pomodoro-duration.webm`,
          },
        },
        {
          audio: getAudio('music'),
          description: m.tour_music_description(),
          id: 'music',
          scrollIntoView: true,
          title: m.tour_music_title(),
        },
        {
          audio: getAudio('music-album'),
          description: m.tour_music_album_description(),
          id: 'music-album',
          scrollIntoView: true,
          title: m.tour_music_title(),
          video: {
            label: m.tour_music_album_video_label(),
            source: `${videoDirectory}/add-album.webm`,
          },
        },
        {
          audio: getAudio('music-expand'),
          description: m.tour_music_expand_description(),
          id: 'music-expand',
          scrollIntoView: true,
          title: m.tour_music_title(),
          video: {
            label: m.tour_music_expand_video_label(),
            source: `${videoDirectory}/expand-player.webm`,
          },
        },
        {
          audio: getAudio('memory-assist'),
          description: m.tour_memory_assist_description(),
          id: 'memory-assist',
          scrollIntoView: true,
          title: m.memory_assist_feedback(),
        },
        ...createMemoryAssistTourSteps(getAudio, videoDirectory),
        {
          audio: getAudio('settings'),
          description: m.tour_settings_description(),
          id: 'settings',
          scrollIntoView: true,
          title: m.tour_settings_title(),
        },
        ...createSettingsTourSteps(getAudio, videoDirectory),
        {
          audio: getAudio('completion'),
          description: m.tour_completion_description(),
          id: 'completion',
          title: m.tour_completion_title(),
        },
      ] satisfies ReadonlyArray<PTourStep>,
  )
  const getStepElement = (stepId: string) => {
    const selector = STEP_SELECTORS[stepId]
    return selector === undefined ? null : (studioElement()?.querySelector(selector) ?? null)
  }

  const onEvent = (event: TourEvent<PTourStep>) => {
    if (event.type === 'started' || event.type === 'step-changed') {
      const source = event.step.audio?.source

      if (source === undefined) {
        audioPlayer.stop()
      } else {
        audioPlayer.play(resolveCurrentAudioSource(source))
      }
      return
    }

    audioPlayer.stop()
  }

  onCleanup(() => audioPlayer.dispose())

  return {getStepElement, isOpen, onEvent, setIsOpen, setStudioElement, steps}
}
