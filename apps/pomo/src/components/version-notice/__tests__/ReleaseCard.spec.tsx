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
  const [changes, setChanges] = createSignal<ReadonlyArray<{title?: string; description: string}>>([
    {description: '기능 설명', title: '새 기능'},
  ])
  render(() => (
    <VersionReleaseCard
      release={{
        changes: changes(),
        notes: ['알림 조건'],
        releasedAt: '2026-09-06',
        summary: '업데이트 요약',
        title: '첫 출시',
        version: '1.0.0',
      }}
    />
  ))
  expect(screen.getByRole('article', {name: '첫 출시'})).toBeVisible()
  expect(screen.getByRole('listitem')).toHaveTextContent('새 기능 — 기능 설명')
  expect(screen.getByText('새 기능').tagName).toBe('STRONG')
  expect(screen.getByText('업데이트 요약')).toBeVisible()
  expect(screen.getByText('※ 알림 조건')).toBeVisible()
  expect(screen.getByText('1.0.0')).toHaveAttribute('datetime', '2026-09-06')
  setChanges([])
  expect(screen.getByText('업데이트 요약')).toBeVisible()
  expect(screen.getByText('※ 알림 조건')).toBeVisible()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  expect(screen.queryByText(m.version_notice_initial_release())).not.toBeInTheDocument()
})

it('should show the initial-release explanation when no body content exists', () => {
  render(() => (
    <VersionReleaseCard
      release={{changes: [], releasedAt: '2026-09-06', title: '첫 출시', version: '1.0.0'}}
    />
  ))
  expect(screen.getByText(m.version_notice_initial_release())).toBeVisible()
})
