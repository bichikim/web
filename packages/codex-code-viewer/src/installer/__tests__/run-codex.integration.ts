/** @vitest-environment node */
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {delimiter, join} from 'node:path'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {runCodex} from '../run-codex'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('runCodex', () => {
  it('should forward stderr before completion and keep stdout separate', async () => {
    const onStderr = vi.fn()
    const result = runCodex({
      args: [
        '-e',
        'process.stderr.write("다운로드 중\\n"); process.stdout.write("{\\"installed\\":true}")',
      ],
      codex: process.execPath,
      home: tmpdir(),
      onStderr,
    })
    let completed = false
    onStderr.mockImplementation(() => {
      expect(completed).toBe(false)
    })
    const output = await result
    completed = true
    expect(onStderr).toHaveBeenCalledExactlyOnceWith('다운로드 중\n')
    expect(output).toBe('{"installed":true}')
  })

  it('should keep the CLI failure details after streaming stderr', async () => {
    const onStderr = vi.fn()
    await expect(
      runCodex({
        args: ['-e', 'process.stderr.write("download failed\\n"); process.exitCode = 1'],
        codex: process.execPath,
        home: tmpdir(),
        onStderr,
      }),
    ).rejects.toThrow('Codex CLI 명령을 실행하지 못했습니다: download failed')
    expect(onStderr).toHaveBeenCalledExactlyOnceWith('download failed\n')
  })

  it('should return stdout without a progress listener', async () => {
    const output = await runCodex({
      args: ['-e', 'process.stdout.write(process.env.CODEX_HOME)'],
      codex: process.execPath,
      home: tmpdir(),
    })
    expect(output).toBe(tmpdir())
  })

  it('should preserve argument boundaries and trailing output newlines', async () => {
    const args = ['한글 경로', 'a"b', 'a&b', 'a|b', 'a^b', '(value)', 'path\\']
    const output = await runCodex({
      args: ['-e', 'console.log(JSON.stringify(process.argv.slice(1)))', '--', ...args],
      codex: process.execPath,
      home: tmpdir(),
    })
    expect(output).toBe(`${JSON.stringify(args)}\n`)
  })

  it('should report a missing executable with its original cause', async () => {
    await expect(
      runCodex({args: [], codex: join(tmpdir(), 'missing-code-viewer-cli'), home: tmpdir()}),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({code: 'ENOENT'}),
      message: expect.stringContaining('Codex CLI 명령을 실행하지 못했습니다:'),
    })
  })

  it.each(['codex', 'codex.cmd'])(
    'should execute an npm-style Windows %s shim with literal arguments',
    {skip: process.platform !== 'win32'},
    async (binary) => {
      const root = await mkdtemp(join(tmpdir(), 'code-viewer-'))
      try {
        const directory = join(root, '한글 npm & (tools)')
        await mkdir(directory)
        await writeFile(
          join(directory, 'cli.cjs'),
          [
            'process.stderr.write("progress\\n");',
            'console.log(JSON.stringify({args:process.argv.slice(2), home:process.env.CODEX_HOME}))',
          ].join('\n'),
        )
        await writeFile(
          join(directory, 'codex.cmd'),
          '@ECHO off\r\n"%CODE_VIEWER_TEST_NODE%" "%~dp0cli.cjs" %*\r\n',
        )
        const pathKey =
          Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
        vi.stubEnv(pathKey, `${directory}${delimiter}${process.env[pathKey] ?? ''}`)
        vi.stubEnv('CODE_VIEWER_TEST_NODE', process.execPath)
        const args = ['plugin', 'add', '한글 경로', 'a"b', 'a&b', 'a|b', 'a^b', '(value)', 'path\\']
        const home = join(root, '한글 설정 & (home)')
        const onStderr = vi.fn()
        const output = await runCodex({
          args,
          codex: binary === 'codex' ? binary : join(directory, binary),
          home,
          onStderr,
        })
        expect(JSON.parse(output)).toEqual({args, home})
        expect(onStderr).toHaveBeenCalledWith('progress\n')
      } finally {
        await rm(root, {force: true, recursive: true})
      }
    },
  )
})
