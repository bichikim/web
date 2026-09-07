/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SafeArea} from '../SafeArea'
import {AppsInToss} from '../safe-area/AppsInToss'

vi.mock('../safe-area/AppsInToss', () => ({AppsInToss: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

it('should mount the Toss implementation in an Apps in Toss build', () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')

  render(() => <SafeArea />)

  expect(AppsInToss).toHaveBeenCalledOnce()
})

it.each([
  {desktop: '', target: 'web', toss: ''},
  {desktop: 'true', target: 'desktop', toss: ''},
  {desktop: '', target: 'explicitly disabled Toss', toss: 'false'},
])('should omit the Toss implementation for $target', (environment) => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', environment.toss)
  vi.stubEnv('VITE_POMO_IS_DESKTOP', environment.desktop)

  const initialStyle = document.documentElement.getAttribute('style')
  const {container} = render(() => <SafeArea />)

  expect(AppsInToss).not.toHaveBeenCalled()
  expect(container.children).toHaveLength(0)
  expect(document.documentElement.getAttribute('style')).toBe(initialStyle)
})
