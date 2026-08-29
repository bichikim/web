import {statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {afterEach, expect, it, vi} from 'vitest'

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

afterEach(() => {
  vi.doUnmock('src/data/licenses')
  vi.resetModules()
})

it('should expose the required license groups', async () => {
  const licenses = await import('../index')

  expect(licenses.openSourceLicenseGroup.id).toBe('core-software')
  expect(licenses.modelLicenseGroup.id).toBe('models')

  const pretendardLicense = licenses.openSourceLicenseGroup.entries.find(
    (entry) => entry.name === 'Pretendard',
  )
  const distributedLicense = pretendardLicense?.links.find(
    (link) => link.label === '배포된 Pretendard 라이선스 원문',
  )

  if (distributedLicense === undefined) {
    throw new Error('Pretendard distributed license link not found')
  }

  expect(distributedLicense.url).toMatch(/^\/fonts\/pretendard\/[^/]+\/LICENSE\.txt$/u)
  expect(
    statSync(resolve(appDirectory, 'public', `.${distributedLicense.url}`)).size,
  ).toBeGreaterThan(0)
})

it('should fail fast when a required license group is absent', async () => {
  vi.doMock('src/data/licenses', () => ({
    default: {groups: [], lastReviewed: '2026-08-26'},
  }))
  vi.resetModules()

  await expect(import('../index')).rejects.toThrow('License group not found: core-software')
})
