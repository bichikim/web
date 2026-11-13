/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {useWidgetPreview} from '../../features/widget-preview'
import {SWidgetSettings} from '../SWidgetSettings'

afterEach(cleanup)

test('should retain background selection in settings and leave presets to the toolbar menu', () => {
  const hook = renderHook(useWidgetPreview)
  render(() => <SWidgetSettings preview={hook.result} />)
  expect(screen.queryByRole('combobox', {name: '표정·행동'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '거리 배경 선택'}))
  expect(hook.result.background()).toBe('street-front')
  fireEvent.click(screen.getByRole('button', {name: '프로필 배경 선택'}))
  expect(hook.result.background()).toBe('profile')
  hook.cleanup()
})
