/** @vitest-environment jsdom */

import {beforeEach, expect, it} from 'vitest'

import {
  deleteFeatureRequestDraft,
  readFeatureRequestDraft,
  writeFeatureRequestDraft,
} from '../draft-storage'

const draft = {
  description: '집중 세션의 통계를 보고 싶어요.',
  title: '집중 세션 통계',
  version: 1 as const,
}

beforeEach(() => {
  sessionStorage.clear()
})

it('should persist and restore an unsaved feature request draft for the browser session', () => {
  writeFeatureRequestDraft(draft)

  expect(readFeatureRequestDraft()).toEqual(draft)
})

it('should ignore malformed feature request drafts', () => {
  sessionStorage.setItem('pomo:feature-request:draft:v1', '{"version":1,"title":3}')

  expect(readFeatureRequestDraft()).toBeNull()
})

it('should remove the draft after the feature request is submitted', () => {
  writeFeatureRequestDraft(draft)
  deleteFeatureRequestDraft()

  expect(readFeatureRequestDraft()).toBeNull()
})
