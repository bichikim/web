/** @vitest-environment jsdom */
import {expect, it} from 'vitest'
import {synchronizeFeeds} from '../feed-sync'
import {CONNECTION, createRepository, createRss, createSettingsResolver} from './feed-sync.fixture'

it('should save new feeds as pending without scheduling audio when automatic preparation is off', async () => {
  const {jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    autoPrepare: false,
    connections: [CONNECTION],
    createId: () => 'pending-job',
    fetcher: async () => new Response(createRss([{id: 'manual-item', minute: '05'}])),
    now: new Date('2026-08-14T00:10:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })
  expect(jobs).toHaveLength(1)
  expect(jobs[0]?.status).toBe('pending')
  expect(summary.queuedJobIds).toEqual([])
})
