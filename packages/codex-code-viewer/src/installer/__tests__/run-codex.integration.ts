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

  it.each([join(tmpdir(), 'missing-code-viewer-cli'), 'missing-code-viewer-cli'])(
    'should report missing executable %s with its original cause',
    async (codex) => {
      await expect(runCodex({args: [], codex, home: tmpdir()})).rejects.toMatchObject({
        cause: expect.objectContaining({code: 'ENOENT'}),
        message: expect.stringContaining(codex),
      })
    },
  )

  it(
    'should explain how to replace a Windows shim without the npm Codex package',
    {skip: process.platform !== 'win32'},
    async () => {
      const root = await mkdtemp(join(tmpdir(), 'code-viewer-'))
      try {
        const codex = join(root, 'custom.cmd')
        await writeFile(codex, '@ECHO off\r\nEXIT /b 97\r\n')
        await expect(runCodex({args: [], codex, home: root})).rejects.toThrow(
          'CODEX_BINARY에 codex.exe 경로를 지정하세요.',
        )
      } finally {
        await rm(root, {force: true, recursive: true})
      }
    },
  )

  it.each(['codex', 'codex.cmd'])(
    'should execute the npm Codex CLI behind Windows %s with literal arguments',
    {skip: process.platform !== 'win32'},
    async (binary) => {
      const root = await mkdtemp(join(tmpdir(), 'code-viewer-'))
      try {
        const directory = join(root, '한글 npm & (tools)')
        const packageRoot = join(directory, 'node_modules', '@openai', 'codex')
        await mkdir(join(packageRoot, 'bin'), {recursive: true})
        await writeFile(
          join(packageRoot, 'package.json'),
          JSON.stringify({bin: {codex: 'bin/codex.js'}, name: '@openai/codex'}),
        )
        await writeFile(
          join(packageRoot, 'bin', 'codex.js'),
          [
            'process.stderr.write("progress\\n");',
            'console.log(JSON.stringify({args:process.argv.slice(2), home:process.env.CODEX_HOME}))',
          ].join('\n'),
        )
        await writeFile(
          join(directory, 'codex.cmd'),
          '@ECHO off\r\n"%CODE_VIEWER_TEST_NODE%" "%~dp0node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n',
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
