/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {VersionReleaseCard} from '../ReleaseCard'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show release changes or the initial-release explanation', () => {
  const [changes, setChanges] = createSignal<readonly string[]>(['새 기능'])
  render(() => (
    <VersionReleaseCard
      release={{changes: changes(), releasedAt: '2026-09-06', title: '첫 출시', version: '1.0.0'}}
    />
  ))
  expect(screen.getByRole('article', {name: '첫 출시'})).toBeVisible()
  expect(screen.getByRole('listitem')).toHaveTextContent('새 기능')
  expect(screen.getByText('1.0.0')).toHaveAttribute('datetime', '2026-09-06')
  setChanges([])
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(screen.getByText(m.version_notice_initial_release())).toBeVisible()
})
