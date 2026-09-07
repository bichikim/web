import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {createMemo, createSignal} from 'solid-js'

import type {PTourStep} from '../tour/PTour'

const STEP_SELECTORS: Readonly<Record<string, string>> = {
  'memory-assist': '[data-tour-step="memory-assist"]',
  music: '.pomo-player-stage',
  'music-album': '.pomo-player-stage',
  'music-expand': '.pomo-player-stage',
  pomodoro: '.pomo-pomodoro',
  'pomodoro-control': '.pomo-pomodoro',
  'pomodoro-detail': '.pomo-pomodoro',
  'pomodoro-duration': '.pomo-pomodoro',
  settings: '[data-tour-step="settings"]',
}

export const useStudioTour = () => {
  const videoDirectory = getLocale() === 'en' ? '/tour/en' : '/tour'
  const [isOpen, setIsOpen] = createSignal(false)
  const [studioElement, setStudioElement] = createSignal<HTMLElement | null>(null)
  const steps = createMemo(
    () =>
      [
        {
          description: m.tour_pomodoro_description(),
          id: 'pomodoro',
          scrollIntoView: true,
          title: m.tour_pomodoro_title(),
        },
        {
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
          description: m.tour_music_description(),
          id: 'music',
          scrollIntoView: true,
          title: m.tour_music_title(),
        },
        {
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
          description: m.tour_memory_assist_description(),
          id: 'memory-assist',
          scrollIntoView: true,
          title: m.memory_assist_feedback(),
        },
        {
          description: m.tour_settings_description(),
          id: 'settings',
          scrollIntoView: true,
          title: m.tour_settings_title(),
        },
      ] satisfies ReadonlyArray<PTourStep>,
  )
  const getStepElement = (stepId: string) => {
    const selector = STEP_SELECTORS[stepId]
    return selector === undefined ? null : (studioElement()?.querySelector(selector) ?? null)
  }

  return {getStepElement, isOpen, setIsOpen, setStudioElement, steps}
}
