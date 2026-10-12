/** @vitest-environment node */
import {tmpdir} from 'node:os'
import {describe, expect, it, vi} from 'vitest'
import {runCodex} from '../run-codex'

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
})
