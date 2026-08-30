import {readFileSync, statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {getRequestEvent} from 'solid-js/web'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {findLicenseGroup, loadLicenseData} from '../index'

vi.mock('solid-js/web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js/web')>()

  return {...actual, getRequestEvent: vi.fn()}
})

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const licenseDataPath = resolve(appDirectory, 'public/licenses.json')
const licenseDataJson = readFileSync(licenseDataPath, 'utf8')

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'false')
  vi.stubEnv('POMO_LICENSE_ASSET_ORIGIN', 'https://www.pomofi.io')
  vi.mocked(getRequestEvent).mockReturnValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('should fetch and validate the public license manifest', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(licenseDataJson))

  const licenseData = await loadLicenseData()
  const openSourceLicenseGroup = findLicenseGroup(licenseData, 'core-software')
  const modelLicenseGroup = findLicenseGroup(licenseData, 'models')
  const pretendardLicense = openSourceLicenseGroup.entries.find(
    (entry) => entry.name === 'Pretendard',
  )
  const officialLicense = pretendardLicense?.links.find(
    (link) => link.label === 'Pretendard 라이선스 원문',
  )

  expect(fetch).toHaveBeenCalledWith('/licenses.json')
  expect(modelLicenseGroup.id).toBe('models')
  expect(officialLicense?.url).toBe('https://github.com/orioncactus/pretendard/blob/main/LICENSE')
  expect(
    statSync(
      resolve(
        appDirectory,
        'public',
        `.${import.meta.env.VITE_POMO_PRETENDARD_BASE_PATH}/LICENSE.txt`,
      ),
    ).size,
  ).toBeGreaterThan(0)
})

it('should fetch the manifest from the trusted public origin during SSR', async () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://www.pomofi.io/third-party-notices'),
  } as ReturnType<typeof getRequestEvent>)
  vi.mocked(fetch).mockResolvedValue(new Response(licenseDataJson))

  await loadLicenseData()

  expect(fetch).toHaveBeenCalledWith('https://www.pomofi.io/licenses.json')
})

it('should fetch the manifest from an allowed local origin during SSR', async () => {
  vi.stubEnv('POMO_ALLOW_LOCAL_ASSET_ORIGIN', 'true')
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('http://127.0.0.1:3000/third-party-notices'),
  } as ReturnType<typeof getRequestEvent>)
  vi.mocked(fetch).mockResolvedValue(new Response(licenseDataJson))

  await loadLicenseData()

  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/licenses.json')
})

it('should ignore an untrusted SSR request origin', async () => {
  vi.mocked(getRequestEvent).mockReturnValue({
    request: new Request('https://example.invalid/third-party-notices'),
  } as ReturnType<typeof getRequestEvent>)
  vi.mocked(fetch).mockResolvedValue(new Response(licenseDataJson))

  await loadLicenseData()

  expect(fetch).toHaveBeenCalledWith('https://www.pomofi.io/licenses.json')
})

it('should report network failures', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  await expect(loadLicenseData()).rejects.toThrow('Failed to fetch license data.')
})

it('should report unsuccessful responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(null, {status: 503}))

  await expect(loadLicenseData()).rejects.toThrow('Failed to fetch license data: 503')
})

it('should report malformed JSON responses', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{'))

  await expect(loadLicenseData()).rejects.toThrow('Failed to parse license data.')
})

it('should reject JSON that does not satisfy the license contract', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}'))

  await expect(loadLicenseData()).rejects.toThrow('Invalid license data.')
})

it('should fail fast when a required license group is absent', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{"groups":[],"lastReviewed":"2026년 8월 29일"}'))
  const licenseData = await loadLicenseData()

  expect(() => findLicenseGroup(licenseData, 'core-software')).toThrow(
    'License group not found: core-software',
  )
})
