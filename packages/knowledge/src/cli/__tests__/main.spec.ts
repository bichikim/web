import {execFile} from 'node:child_process'
import {resolve} from 'node:path'
import {promisify} from 'node:util'
import {describe, expect, it} from 'vitest'

const execute = promisify(execFile)
const entry = resolve('packages/knowledge/bin/know.mjs')

describe('know CLI process', () => {
  it('should print executable help without contacting external services', async () => {
    const result = await execute(process.execPath, [entry, '--help'])
    expect(result.stdout).toContain('know index')
    expect(result.stdout).toContain('know search')
    expect(result.stdout).toContain('know get')
    expect(result.stdout).toContain('know status')
    expect(result.stdout).toContain('know doctor')
    expect(result.stdout).toContain('know reindex')
    expect(result.stdout).toContain('know mcp')
    expect(result.stderr).toBe('')
  })
  it('should reject missing queries and invalid limits with a nonzero exit code', async () => {
    await expect(execute(process.execPath, [entry, 'get'])).rejects.toMatchObject({code: 2})
    await expect(
      execute(process.execPath, [entry, 'status', 'a', '--repo', 'b']),
    ).rejects.toMatchObject({code: 2})
    await expect(execute(process.execPath, [entry, 'search'])).rejects.toMatchObject({code: 2})
    await expect(
      execute(process.execPath, [entry, 'search', 'query', '--limit', '0']),
    ).rejects.toMatchObject({code: 2})
  })
})
