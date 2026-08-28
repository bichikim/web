import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {build, createLogger, createServer} from 'vite'
import {type EmbeddingProvider, keySimilarity} from '../index'

const temporaryPaths: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

const provider: EmbeddingProvider = {
  async embed(texts) {
    return texts.map(() => Float32Array.from([1, 0]))
  },
  identifier: 'offline-fixture',
  revision: '1',
}

const createFixture = async () => {
  const root = await mkdtemp(path.join(import.meta.dirname, '.vite-'))
  temporaryPaths.push(root)
  await mkdir(path.join(root, 'src'))
  await writeFile(
    path.join(root, 'index.html'),
    '<script type="module" src="/src/main.ts"></script>',
  )
  await writeFile(path.join(root, 'src/i18n.ts'), 'export const t = (key: string) => key')
  await writeFile(
    path.join(root, 'src/secondary.ts'),
    `import {t} from './i18n'; export const secondary = t('로그인에 실패했습니다.')`,
  )
  await writeFile(
    path.join(root, 'src/tertiary.ts'),
    `import {t} from './i18n'; export const tertiary = t('로그인하지 못했습니다.')`,
  )
  await writeFile(
    path.join(root, 'src/main.ts'),
    `import {t} from './i18n';
import {secondary} from './secondary';
import {tertiary} from './tertiary';
document.body.textContent = t('로그인에 실패했어요.') + secondary + tertiary`,
  )
  return root
}

const createPlugin = (root: string, buildMode: 'error' | 'warn' = 'error') =>
  keySimilarity({
    __embeddingProvider: provider,
    buildMode,
    cacheDir: path.join(root, '.cache'),
    keyDetector: ({imported, source}) => (imported === 't' && source === './i18n' ? 0 : undefined),
    semanticThreshold: 0.8,
  })

describe('Vite integration', () => {
  it('should report both locations in an actual middleware-mode dev server', async () => {
    const root = await createFixture()
    const logger = createLogger('silent')
    const warning = vi.spyOn(logger, 'warn')
    const server = await createServer({
      configFile: false,
      customLogger: logger,
      plugins: [createPlugin(root)],
      root,
      server: {middlewareMode: true},
    })
    try {
      await server.transformRequest('/src/main.ts')
      await server.transformRequest('/src/secondary.ts')
      await server.transformRequest('/src/tertiary.ts')
      await vi.waitFor(() => {
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('로그인에 실패했어요.'))
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('로그인에 실패했습니다.'))
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('Group 1 (3 keys):'))
      })
      const messages = warning.mock.calls.map(([message]) => String(message)).join('\n')
      const individualMessages = warning.mock.calls.map(([message]) => String(message))
      expect(messages).toContain('src/main.ts:4:')
      expect(messages).toContain('src/secondary.ts:1:')
      expect(messages).not.toContain(root)
      expect(new Set(individualMessages).size).toBe(individualMessages.length)
    } finally {
      await server.close()
    }
  })

  it('should fail an actual Vite build after all queued comparisons finish', async () => {
    const root = await createFixture()

    await expect(
      build({configFile: false, logLevel: 'silent', plugins: [createPlugin(root)], root}),
    ).rejects.toThrow('Similar key groups')
  })

  it('should report an annotated call once with its effective comparison texts', async () => {
    const root = await createFixture()
    await writeFile(
      path.join(root, 'src/main.ts'),
      [
        `import {t} from './i18n'`,
        `import {secondary} from './secondary'`,
        `/* @key-similarity-with 로그인 실패 */`,
        `/* @key-similarity-ignore-literal */`,
        `const message = t('legacy.login.failure')`,
        `document.body.textContent = message + secondary`,
      ].join('\n'),
    )
    const logger = createLogger('silent')
    const warning = vi.spyOn(logger, 'warn')

    await build({
      configFile: false,
      customLogger: logger,
      plugins: [createPlugin(root, 'warn')],
      root,
    })

    const message = warning.mock.calls.map(([value]) => String(value)).join('\n')
    expect(message).toContain('Group 1 (2 keys):')
    expect(message).toContain('legacy.login.failure  [compared as: 로그인 실패]')
    expect(message.match(/legacy\.login\.failure/gu)).toHaveLength(1)
  })

  it('should only compare modules loaded by Vite', async () => {
    const root = await createFixture()
    await writeFile(
      path.join(root, 'src/main.ts'),
      `import {t} from './i18n'; document.body.textContent = t('로그인에 실패했습니다.')`,
    )
    await writeFile(
      path.join(root, 'src/not-imported.ts'),
      `import {t} from './i18n'; t('로그인에 실패했어요.')`,
    )

    await expect(
      build({configFile: false, logLevel: 'silent', plugins: [createPlugin(root)], root}),
    ).resolves.toBeDefined()
  })

  it('should preserve each duplicate plugin reporting policy', async () => {
    const root = await createFixture()
    const keyDetector = () => 0
    const options = {
      __embeddingProvider: provider,
      cacheDir: path.join(root, '.cache'),
      keyDetector,
    }

    await expect(
      build({
        configFile: false,
        logLevel: 'silent',
        plugins: [
          keySimilarity({...options, buildMode: 'warn'}),
          keySimilarity({...options, buildMode: 'error'}),
        ],
        root,
      }),
    ).rejects.toThrow('Similar key groups')
  })

  it('should skip initialization when build diagnostics are off', async () => {
    const root = await createFixture()

    await expect(
      build({
        configFile: false,
        logLevel: 'silent',
        plugins: [
          keySimilarity({
            buildMode: 'off',
            keyDetector: () => 0,
            modelPath: './missing-model',
          }),
        ],
        root,
      }),
    ).resolves.toBeDefined()
  })

  it('should not merge a transitive similarity chain into one group', async () => {
    const root = await createFixture()
    await writeFile(
      path.join(root, 'src/main.ts'),
      `import {t} from './i18n';
import {secondary} from './secondary';
import {tertiary} from './tertiary';
document.body.textContent = t('alpha') + secondary + tertiary`,
    )
    await writeFile(
      path.join(root, 'src/secondary.ts'),
      `import {t} from './i18n'; export const secondary = t('bridge')`,
    )
    await writeFile(
      path.join(root, 'src/tertiary.ts'),
      `import {t} from './i18n'; export const tertiary = t('omega')`,
    )
    const chainProvider: EmbeddingProvider = {
      async embed(texts) {
        const vectors = new Map([
          ['alpha', Float32Array.from([1, 0])],
          ['bridge', Float32Array.from([0.8, 0.6])],
          ['omega', Float32Array.from([0, 1])],
        ])
        return texts.map((text) => {
          const vector = vectors.get(text)
          if (vector === undefined) {
            throw new Error(`Unexpected fixture text: ${text}`)
          }
          return vector
        })
      },
      identifier: 'chain-fixture',
      revision: '1',
    }
    const logger = createLogger('silent')
    const warning = vi.spyOn(logger, 'warn')

    await build({
      configFile: false,
      customLogger: logger,
      plugins: [
        keySimilarity({
          __embeddingProvider: chainProvider,
          buildMode: 'warn',
          cacheDir: path.join(root, '.chain-cache'),
          keyDetector: ({imported, source}) =>
            imported === 't' && source === './i18n' ? 0 : undefined,
          semanticThreshold: 0.5,
        }),
      ],
      root,
    })

    const messages = warning.mock.calls.map(([message]) => String(message)).join('\n')
    expect(messages).toContain('Group 1 (2 keys):')
    expect(messages).toContain('Group 2 (2 keys):')
    expect(messages).not.toContain('(3 keys)')
  })
})
