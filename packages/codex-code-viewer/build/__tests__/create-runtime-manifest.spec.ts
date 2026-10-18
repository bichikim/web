/** @vitest-environment node */
import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {beforeEach, expect, it, vi} from 'vitest'
import {createRuntimeManifest} from '../create-runtime-manifest'

vi.mock('node:fs/promises', () => ({readFile: vi.fn(), writeFile: vi.fn()}))
beforeEach(() => vi.resetAllMocks())

it('should record the versioned release URL and exact host archive integrity', async () => {
  const bytes = Buffer.from('native runtime')
  vi.mocked(readFile).mockResolvedValue(bytes)
  await createRuntimeManifest({
    archive: '/dist/claude/runtime.zip',
    host: 'darwin-arm64',
    version: '1.2.3',
  })
  const [path, content] = vi.mocked(writeFile).mock.calls[0]!
  expect(path).toBe('/dist/claude/manifest.json')
  expect(JSON.parse(String(content))).toEqual({
    hosts: {
      'darwin-arm64': {
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        url: 'https://github.com/bichikim/web/releases/download/code-viewer-runtime-v1.2.3/runtime.zip',
      },
    },
    version: '1.2.3',
  })
})
