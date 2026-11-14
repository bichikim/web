/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {EditorHelp} from '../EditorHelp'

test('should notify on opening help and close without notifying again', async () => {
  const onOpen = vi.fn()
  render(() => <EditorHelp onOpen={onOpen} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '도움말'}))
  expect(screen.getByRole('dialog', {name: 'Puppet 도움말'})).toBeVisible()
  expect(
    screen.getByText('⌘ 또는 Ctrl을 누르고 여러 레이어를 선택해 그룹으로 묶을 수 있습니다.'),
  ).toBeVisible()
  expect(onOpen).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: 'Dismiss'}))
  await waitFor(() =>
    expect(screen.getByRole('button', {name: '도움말'})).toHaveAttribute('aria-expanded', 'false'),
  )
  expect(onOpen).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', {name: '도움말'}))
  expect(onOpen).toHaveBeenCalledTimes(2)
})

test('should open help without an optional callback and close with Escape', async () => {
  render(() => <EditorHelp />)
  fireEvent.click(screen.getByRole('button', {name: '도움말'}))
  const dialog = screen.getByRole('dialog', {name: 'Puppet 도움말'})
  expect(dialog).toBeVisible()
  fireEvent.keyDown(dialog, {key: 'Escape'})
  await waitFor(() =>
    expect(screen.getByRole('button', {name: '도움말'})).toHaveAttribute('aria-expanded', 'false'),
  )
})
