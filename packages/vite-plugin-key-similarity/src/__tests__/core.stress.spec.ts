import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {KeySimilarityCore} from '../core'
import type {EmbeddingProvider} from '../types'

const FILE_COUNT = 64
const KEYS_PER_FILE = 32
const KEY_COUNT = FILE_COUNT * KEYS_PER_FILE
const STRESS_TEST_TIMEOUT = 60_000
const VECTOR_DIMENSIONS = 12

const formatKey = (identifier: number): string =>
  `stress-key-${identifier.toString().padStart(4, '0')}`

const createSource = (start: number, replacement?: number): string =>
  [
    `import {t} from '@/i18n'`,
    ...Array.from(
      {length: KEYS_PER_FILE},
      (_, offset) =>
        `t('${formatKey(offset === 0 && replacement !== undefined ? replacement : start + offset)}')`,
    ),
  ].join('\n')

const createVector = (text: string): Float32Array => {
  const match = /^stress-key-(\d+)$/u.exec(text)
  if (match === null) {
    throw new Error(`Unexpected stress-test key: ${text}`)
  }
  const identifier = Number(match[1])
  return Float32Array.from({length: VECTOR_DIMENSIONS}, (_, bit) =>
    Math.floor(identifier / 2 ** bit) % 2 === 0 ? -1 : 1,
  )
}

it(
  'should preserve incremental results while processing thousands of keys',
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'key-similarity-stress-'))
    const sourceDir = path.join(root, 'src')
    const lastFilePath = path.join(sourceDir, `${FILE_COUNT - 1}.ts`)
    const embed = vi.fn(async (texts: ReadonlyArray<string>) => texts.map(createVector))
    const provider: EmbeddingProvider = {
      embed,
      identifier: 'deterministic-stress-test',
      revision: '1',
    }

    try {
      await mkdir(sourceDir)
      await Promise.all(
        Array.from({length: FILE_COUNT}, (_, fileIndex) =>
          writeFile(
            path.join(sourceDir, `${fileIndex}.ts`),
            createSource(fileIndex * KEYS_PER_FILE),
          ),
        ),
      )
      const core = new KeySimilarityCore(
        resolveOptions(
          {
            __embeddingProvider: provider,
            cacheDir: '.cache',
            keyDetector: ({imported, source}) =>
              imported === 't' && source === '@/i18n' ? 0 : undefined,
            scanInclude: ['src/**/*.ts'],
            semanticThreshold: 0.99,
          },
          root,
        ),
      )

      const initial = await core.initialize()

      expect(initial.filesScanned).toBe(FILE_COUNT)
      expect(initial.uniqueKeys).toBe(KEY_COUNT)
      expect(initial.diagnostics).toEqual([])
      expect(embed).toHaveBeenCalledOnce()
      expect(embed.mock.calls[0]?.[0]).toHaveLength(KEY_COUNT)

      const duplicate = await core.updateFile(
        lastFilePath,
        createSource((FILE_COUNT - 1) * KEYS_PER_FILE, 0),
      )

      expect(duplicate.diagnostics).toHaveLength(1)
      expect(duplicate.diagnostics[0]?.left.originalText).toBe(formatKey(0))
      expect(duplicate.diagnostics[0]?.right.originalText).toBe(formatKey(0))
      expect(embed).toHaveBeenCalledOnce()

      const replaced = await core.updateFile(
        lastFilePath,
        createSource((FILE_COUNT - 1) * KEYS_PER_FILE, KEY_COUNT),
      )

      expect(replaced.uniqueKeys).toBe(KEY_COUNT)
      expect(replaced.diagnostics).toEqual([])
      expect(embed).toHaveBeenCalledTimes(2)
      expect(embed.mock.calls[1]?.[0]).toEqual([formatKey(KEY_COUNT)])

      const removed = await core.updateFile(lastFilePath, undefined)

      expect(removed.filesScanned).toBe(FILE_COUNT - 1)
      expect(removed.uniqueKeys).toBe(KEY_COUNT - KEYS_PER_FILE)
      expect(removed.diagnostics).toEqual([])
    } finally {
      await rm(root, {force: true, recursive: true})
    }
  },
  STRESS_TEST_TIMEOUT,
)
