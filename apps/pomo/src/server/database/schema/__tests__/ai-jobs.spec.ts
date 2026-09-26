/** @vitest-environment node */
import {getTableConfig} from 'drizzle-orm/pg-core'
import {expect, it} from 'vitest'

import {
  aiArtifactLifecycleEnum,
  aiConcurrencyBuckets,
  aiCostLedger,
  aiJobArtifacts,
  aiJobCapabilityEnum,
  aiJobs,
  aiJobStatusEnum,
  aiUsageBuckets,
} from '../ai-jobs'

it('should expose the AI job capabilities and durable coordination indexes', () => {
  expect(aiJobCapabilityEnum.enumValues).toEqual([
    'text',
    'speech_to_text',
    'text_to_speech',
    'image',
    'sound',
  ])
  expect(aiJobStatusEnum.enumValues).toEqual([
    'queued',
    'running',
    'recovery_pending',
    'succeeded',
    'failed',
    'cancelled',
    'timed_out',
  ])
  expect(getTableConfig(aiJobs)).toMatchObject({
    checks: expect.any(Array),
    foreignKeys: [expect.any(Object)],
    indexes: [expect.any(Object), expect.any(Object), expect.any(Object)],
  })
  expect(getTableConfig(aiUsageBuckets).name).toBe('ai_usage_buckets')
  expect(aiArtifactLifecycleEnum.enumValues).toEqual([
    'temporary',
    'archiving',
    'archive_cleanup_pending',
    'saved',
    'deletion_pending',
    'deleted',
  ])
  expect(getTableConfig(aiConcurrencyBuckets).name).toBe('ai_concurrency_buckets')
  expect(getTableConfig(aiJobArtifacts).name).toBe('ai_job_artifacts')
  expect(getTableConfig(aiJobArtifacts).columns.map(({name}) => name)).toEqual(
    expect.arrayContaining(['archivePendingAt', 'pendingObjectKey']),
  )
  expect(getTableConfig(aiJobs).columns.map(({name}) => name)).toContain('intermediateCleanupAt')
  expect(getTableConfig(aiCostLedger).name).toBe('ai_cost_ledger')
})
