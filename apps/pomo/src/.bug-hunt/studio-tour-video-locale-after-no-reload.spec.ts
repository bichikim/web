/** @vitest-environment jsdom */

import {getLocale, setLocale} from '@paraglide/runtime'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {useStudioTour} from '../components/p-studio/use-tour'

describe('studio tour locale integration', () => {
  const previousDocumentLocale = document.documentElement.lang
  let previousRuntimeLocale: ReturnType<typeof getLocale>

  beforeEach(() => {
    previousRuntimeLocale = getLocale()
    document.documentElement.lang = 'ko'
  })

  afterEach(async () => {
    document.documentElement.lang = previousDocumentLocale
    await setLocale(previousRuntimeLocale, {reload: false})
  })

  it('should point tour videos at the English directory after a no-reload locale switch', async () => {
    await setLocale('ko', {reload: false})
    const view = renderHook(() => useStudioTour())

    await setLocale('en', {reload: false})
    expect(getLocale()).toBe('en')

    const controlStep = view.result.steps().find((step) => step.id === 'pomodoro-control')
    expect(controlStep?.video?.source).toBe('/tour/en/pomodoro-control.webm')
  })
})
