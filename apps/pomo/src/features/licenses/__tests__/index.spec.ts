import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.doUnmock('src/data/licenses.json')
  vi.resetModules()
})

it('should expose the required license groups', async () => {
  const licenses = await import('../index')

  expect(licenses.openSourceLicenseGroup.id).toBe('core-software')
  expect(licenses.modelLicenseGroup.id).toBe('models')
})

it('should fail fast when a required license group is absent', async () => {
  vi.doMock('src/data/licenses.json', () => ({
    default: {groups: [], lastReviewed: '2026-08-26'},
  }))
  vi.resetModules()

  await expect(import('../index')).rejects.toThrow('License group not found: core-software')
})
