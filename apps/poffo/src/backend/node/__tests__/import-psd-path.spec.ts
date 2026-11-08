/** @vitest-environment node */
import {afterEach, expect, test, vi} from 'vitest'
import {stat} from 'node:fs/promises'
import {importPsdPath} from '../import-psd-path'

vi.mock('node:fs/promises', () => ({readFile: vi.fn(), stat: vi.fn()}))
afterEach(() => vi.resetAllMocks())

test('should report a missing path as a read failure', async () => {
  vi.mocked(stat).mockRejectedValue(new Error('not found'))
  expect(await importPsdPath('/missing.psd')).toEqual({error: {code: 'read-failed'}, ok: false})
})

test('should preserve cancellation before accessing the file system', async () => {
  const reason = new Error('cancelled')
  await expect(importPsdPath('/model.psd', AbortSignal.abort(reason))).rejects.toBe(reason)
  expect(stat).not.toHaveBeenCalled()
})
