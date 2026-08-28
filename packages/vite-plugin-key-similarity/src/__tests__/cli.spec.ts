import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {runCliWithOptions} from '../cli'

const temporaryPaths: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    temporaryPaths.splice(0).map((filePath) => rm(filePath, {force: true, recursive: true})),
  )
})

const provider = {
  async embed(texts: ReadonlyArray<string>) {
    return texts.map(() => Float32Array.from([1, 0]))
  },
  identifier: 'cli-local',
  revision: '1',
}

describe('runCli', () => {
  it('should report similar key pairs and return a failing check status', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'key-cli-'))
    temporaryPaths.push(root)
    await mkdir(path.join(root, 'src'))
    await writeFile(
      path.join(root, 'src/main.ts'),
      `import {t} from '@/i18n'; t('로그인하지 못했습니다.'); t('로그인에 실패했습니다.')`,
    )
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    const exitCode = await runCliWithOptions(
      {command: 'check', configPath: '', json: true},
      {
        __embeddingProvider: provider,
        keyDetector: ({imported, source}) =>
          imported === 't' && source === '@/i18n' ? 0 : undefined,
      },
      root,
    )

    expect(exitCode).toBe(1)
    expect(output).toHaveBeenCalledWith(expect.stringContaining('로그인하지 못했습니다.'))
    expect(output).toHaveBeenCalledWith(expect.stringContaining('로그인에 실패했습니다.'))
  })

  it('should benchmark a clean project', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'key-cli-'))
    temporaryPaths.push(root)
    await mkdir(path.join(root, 'src'))
    await writeFile(path.join(root, 'src/main.ts'), `import {t} from '@/i18n'; t('로그인')`)
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const embed = vi.fn(provider.embed)

    expect(
      await runCliWithOptions(
        {command: 'benchmark', configPath: '', json: true},
        {
          __embeddingProvider: {...provider, embed},
          keyDetector: ({imported, source}) =>
            imported === 't' && source === '@/i18n' ? 0 : undefined,
          scanInclude: ['src/**/*.ts'],
        },
        root,
      ),
    ).toBe(0)
    expect(output).toHaveBeenCalledWith(expect.stringContaining('"warm"'))
    expect(output).not.toHaveBeenCalledWith(expect.stringContaining('hmrEmbeddedTextCount'))
    expect(embed).toHaveBeenCalledOnce()
  })
})
