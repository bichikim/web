/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {afterEach, describe, expect, it} from 'vitest'

import {useStudioTour} from '../use-tour'

const originalGetLocale = getLocale

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
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
    ])
    expect(steps.at(-1)).toMatchObject({
      description:
        'Configure scenes, display, events, feeds, dialogue, user information, and more across Pomofi.',
      title: 'Settings',
    })
  })
})
