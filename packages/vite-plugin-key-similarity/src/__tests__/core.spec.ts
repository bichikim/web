import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {resolveOptions} from '../config'
import {KeySimilarityCore} from '../core'
import type {EmbeddingProvider} from '../types'

const embeddingMocks = vi.hoisted(() => ({createLocalE5Provider: vi.fn()}))

vi.mock('../embedding', async () => {
  const actual = await vi.importActual<typeof import('../embedding')>('../embedding')
  return {...actual, createLocalE5Provider: embeddingMocks.createLocalE5Provider}
})

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

const createProvider = (): EmbeddingProvider & {embed: ReturnType<typeof vi.fn>} => ({
  embed: vi.fn(async (texts: ReadonlyArray<string>) =>
    texts.map((text) => {
      if (text.includes('로그인')) {
        return Float32Array.from([1, 0, 0])
      }
      if (text.includes('결제')) {
        return Float32Array.from([0, 1, 0])
      }
      return Float32Array.from([0, 0, 1])
    }),
  ),
  identifier: 'deterministic-local-test',
  revision: '1',
})

const createFixture = async (fileOrder: 'forward' | 'reverse' = 'forward') => {
  const root = await mkdtemp(path.join(tmpdir(), 'key-similarity-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  const files = [
    ['a.ts', `import {t} from '@/i18n'; t('로그인하지 못했습니다.')`],
    ['b.ts', `import {t as translate} from '@/i18n'; translate('로그인에 실패했어요.')`],
  ] as const
  const orderedFiles: ReadonlyArray<readonly [string, string]> =
    fileOrder === 'forward' ? files : [...files].reverse()
  await Promise.all(
    orderedFiles.map(([fileName, code]) => writeFile(path.join(root, 'src', fileName), code)),
  )
  return root
}

const createCore = (root: string, provider: EmbeddingProvider) => {
  embeddingMocks.createLocalE5Provider.mockResolvedValue(provider)

  return new KeySimilarityCore(
    resolveOptions(
      {
        keyDetector: ({imported, source}) =>
          imported === 't' && source === '@/i18n' ? 0 : undefined,
        scanInclude: ['src/**/*.ts'],
        semanticThreshold: 0.8,
      },
      root,
    ),
  )
}

describe('KeySimilarityCore', () => {
  it('should produce deterministic pairs independent of file creation order', async () => {
    const first = await createCore(await createFixture('forward'), createProvider()).initialize()
    const second = await createCore(await createFixture('reverse'), createProvider()).initialize()

    const summarize = (report: typeof first) =>
      report.diagnostics.map((diagnostic) => ({
        leftFile: path.basename(diagnostic.left.filePath),
        leftText: diagnostic.left.originalText,
        rightFile: path.basename(diagnostic.right.filePath),
        rightText: diagnostic.right.originalText,
      }))
    expect(summarize(first)).toEqual(summarize(second))
    expect(summarize(first)).toHaveLength(1)
  })

  it('should reuse cached vectors and only embed a new HMR sentence', async () => {
    const root = await createFixture()
    const provider = createProvider()
    const core = createCore(root, provider)
    await core.initialize()
    const firstCallCount = provider.embed.mock.calls.length
    await core.updateFile(
      path.join(root, 'src/a.ts'),
      `import {t} from '@/i18n'; t('완전히 새로운 문장')`,
    )

    expect(provider.embed.mock.calls.length).toBe(firstCallCount + 1)
    expect(provider.embed.mock.calls.at(-1)?.[0]).toEqual(['완전히 새로운 문장'])

    const warmProvider = createProvider()
    await createCore(root, warmProvider).initialize()
    expect(warmProvider.embed).not.toHaveBeenCalled()
  })

  it('should remove all pairs involving a deleted file', async () => {
    const root = await createFixture()
    const core = createCore(root, createProvider())
    await core.initialize()

    await core.updateFile(path.join(root, 'src/a.ts'), undefined)

    expect(core.report.diagnostics).toEqual([])
    expect(core.filePaths).toEqual([path.join(root, 'src/b.ts')])
  })

  it('should compare two keys extracted from the same file', async () => {
    const root = await createFixture()
    const filePath = path.join(root, 'src/a.ts')
    await writeFile(
      filePath,
      `import {t} from '@/i18n'; t('로그인하지 못했습니다.'); t('로그인에 실패했어요.')`,
    )
    await writeFile(path.join(root, 'src/b.ts'), `export const value = true`)

    const report = await createCore(root, createProvider()).initialize()

    expect(report.diagnostics).toHaveLength(1)
    expect(report.diagnostics[0]?.left.filePath).toBe(filePath)
    expect(report.diagnostics[0]?.right.filePath).toBe(filePath)
  })

  it('should retain every threshold-passing pair in a group', async () => {
    const root = await createFixture()
    const filePath = path.join(root, 'src/a.ts')
    await writeFile(
      filePath,
      `import {t} from '@/i18n'; t('하나'); t('둘'); t('셋'); t('넷'); t('다섯')`,
    )
    await writeFile(path.join(root, 'src/b.ts'), `export const value = true`)

    const report = await createCore(root, createProvider()).initialize()

    expect(report.diagnostics).toHaveLength(10)
  })

  it('should only compare keys belonging to the same group', async () => {
    const root = await createFixture()
    const identical = `import {t} from '@/i18n'; t('같은 키')`
    await writeFile(path.join(root, 'src/a.ts'), identical)
    await writeFile(path.join(root, 'src/b.ts'), identical)
    embeddingMocks.createLocalE5Provider.mockResolvedValue(createProvider())
    const core = new KeySimilarityCore(
      resolveOptions(
        {
          keyDetector: ({filePath, imported, source}) =>
            imported === 't' && source === '@/i18n'
              ? {argumentIndex: 0, group: path.basename(filePath)}
              : undefined,
          scanInclude: ['src/**/*.ts'],
        },
        root,
      ),
    )

    const report = await core.initialize()

    expect(report.diagnostics).toEqual([])
    expect(report.uniqueKeys).toBe(2)
  })

  it('should use the stricter function threshold from either key in a pair', async () => {
    const root = await createFixture()
    await writeFile(path.join(root, 'src/a.ts'), `import {t} from '@/i18n'; t('save')`)
    await writeFile(path.join(root, 'src/b.ts'), `import {t} from '@/i18n'; t('saved')`)
    const provider: EmbeddingProvider = {
      async embed(texts) {
        return texts.map((text) =>
          text === 'save' ? Float32Array.from([1, 0]) : Float32Array.from([0.6, 0.8]),
        )
      },
      identifier: 'threshold-test',
      revision: '1',
    }
    const createThresholdCore = (savedThreshold: number) => {
      embeddingMocks.createLocalE5Provider.mockResolvedValue(provider)

      return new KeySimilarityCore(
        resolveOptions(
          {
            cacheDir: `.cache-${savedThreshold}`,
            keyDetector: ({imported, source}) =>
              imported === 't' && source === '@/i18n' ? 0 : undefined,
            scanInclude: ['src/**/*.ts'],
            semanticThreshold: (key) => (key === 'saved' ? savedThreshold : 0.5),
          },
          root,
        ),
      )
    }

    const strict = await createThresholdCore(0.7).initialize()
    const permissive = await createThresholdCore(0.6).initialize()

    expect(strict.diagnostics).toEqual([])
    expect(permissive.diagnostics).toHaveLength(1)
    expect(permissive.diagnostics[0]?.leftComparison.semanticThreshold).toBe(0.5)
    expect(permissive.diagnostics[0]?.rightComparison.semanticThreshold).toBe(0.6)
    expect(permissive.diagnostics[0]?.semanticThreshold).toBe(0.6)
  })

  it('should keep only the highest passing representation pair for two calls', async () => {
    const root = await createFixture()
    await writeFile(
      path.join(root, 'src/a.ts'),
      [
        `import {t} from '@/i18n'`,
        `/* @key-similarity-with canonical login failure */`,
        `t('opaque.login.failure')`,
      ].join('\n'),
    )
    await writeFile(
      path.join(root, 'src/b.ts'),
      `import {t} from '@/i18n'; t('login could not be completed')`,
    )
    const provider: EmbeddingProvider = {
      async embed(texts) {
        return texts.map((text) => {
          if (text === 'canonical login failure') {
            return Float32Array.from([1, 0])
          }
          if (text === 'login could not be completed') {
            return Float32Array.from([0.8, 0.6])
          }
          return Float32Array.from([0, 1])
        })
      },
      identifier: 'representation-pair-test',
      revision: '1',
    }

    const report = await createCore(root, provider).initialize()

    expect(report.diagnostics).toHaveLength(1)
    expect(report.diagnostics[0]).toMatchObject({
      leftComparison: {originalText: 'canonical login failure'},
      rightComparison: {originalText: 'login could not be completed'},
    })
    expect(report.diagnostics[0]?.semanticScore).toBeCloseTo(0.8)
  })

  it('should not embed an ignored literal and should keep its call location', async () => {
    const root = await createFixture()
    await writeFile(
      path.join(root, 'src/a.ts'),
      [
        `import {t} from '@/i18n'`,
        `/* @key-similarity-with 로그인 실패 */`,
        `/* @key-similarity-ignore-literal */`,
        `t('legacy.login.failure')`,
      ].join('\n'),
    )
    await writeFile(path.join(root, 'src/b.ts'), `import {t} from '@/i18n'; t('로그인 실패')`)
    const provider = createProvider()

    const report = await createCore(root, provider).initialize()

    const embeddedTexts = provider.embed.mock.calls.flatMap(([texts]) => texts)
    expect(embeddedTexts).not.toContain('legacy.login.failure')
    expect(report.diagnostics).toHaveLength(1)
    expect(report.diagnostics[0]?.left.originalText).toBe('legacy.login.failure')
    expect(report.diagnostics[0]?.leftComparison.originalText).toBe('로그인 실패')
  })
})
