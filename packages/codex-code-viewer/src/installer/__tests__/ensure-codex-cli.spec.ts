/** @vitest-environment node */
import {EventEmitter} from 'node:events'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline/promises'
import {beforeEach, expect, it, vi} from 'vitest'
import {ensureCodexCli} from '../ensure-codex-cli'
import {runCodex} from '../run-codex'

vi.mock('node:child_process', () => ({spawn: vi.fn()}))
vi.mock('node:readline/promises', () => ({createInterface: vi.fn()}))
vi.mock('../run-codex', () => ({runCodex: vi.fn()}))
const options = {codex: 'codex', home: '/codex', installCodex: false, interactive: true}
const question = vi.fn()
const close = vi.fn()
const missing = new Error('missing', {cause: Object.assign(new Error('missing'), {code: 'ENOENT'})})
let installation: EventEmitter
beforeEach(() => {
  vi.resetAllMocks()
  installation = new EventEmitter()
  vi.mocked(runCodex).mockRejectedValueOnce(missing).mockResolvedValue('codex 1.0')
  vi.mocked(createInterface).mockReturnValue({close, question} as unknown as ReturnType<
    typeof createInterface
  >)
  vi.mocked(spawn).mockReturnValue(installation as ReturnType<typeof spawn>)
})

it('should leave an existing CLI unchanged', async () => {
  vi.mocked(runCodex).mockReset().mockResolvedValue('codex 1.0')
  await ensureCodexCli(options)
  expect(createInterface).not.toHaveBeenCalled()
  expect(spawn).not.toHaveBeenCalled()
})
it.each(['y', 'Y', 'yes'])(
  'should install after %s and verify the CLI before continuing',
  async (answer) => {
    question.mockResolvedValue(answer)
    const pending = ensureCodexCli(options)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    expect(spawn).toHaveBeenCalledWith(
      expect.stringMatching(/^npm(?:\.cmd)?$/u),
      ['install', '-g', '@openai/codex'],
      expect.objectContaining({stdio: 'inherit'}),
    )
    expect(runCodex).toHaveBeenCalledTimes(1)
    installation.emit('close', 0)
    await pending
    expect(runCodex).toHaveBeenCalledTimes(2)
    expect(close).toHaveBeenCalledOnce()
  },
)
it.each(['', 'n', 'no', 'maybe'])('should stop without installing after %j', async (answer) => {
  question.mockResolvedValue(answer)
  await expect(ensureCodexCli(options)).rejects.toThrow('Installation was not started')
  expect(spawn).not.toHaveBeenCalled()
  expect(close).toHaveBeenCalledOnce()
})
it('should stop noninteractive execution with an explicit opt-in hint', async () => {
  await expect(ensureCodexCli({...options, interactive: false})).rejects.toThrow('--install-codex')
  expect(createInterface).not.toHaveBeenCalled()
  expect(spawn).not.toHaveBeenCalled()
})
it('should install with explicit opt-in without prompting', async () => {
  const pending = ensureCodexCli({...options, installCodex: true, interactive: false})
  await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
  installation.emit('close', 0)
  await pending
  expect(createInterface).not.toHaveBeenCalled()
})
it('should preserve CLI errors other than a missing executable', async () => {
  const error = new Error('permission denied', {
    cause: Object.assign(new Error('denied'), {code: 'EACCES'}),
  })
  vi.mocked(runCodex).mockReset().mockRejectedValue(error)
  await expect(ensureCodexCli(options)).rejects.toBe(error)
  expect(createInterface).not.toHaveBeenCalled()
  expect(spawn).not.toHaveBeenCalled()
})
it('should ask to correct a missing custom binary rather than installing elsewhere', async () => {
  await expect(
    ensureCodexCli({...options, codex: '/custom/codex', installCodex: true}),
  ).rejects.toThrow('CODEX_BINARY')
  expect(spawn).not.toHaveBeenCalled()
})
it('should stop when npm fails', async () => {
  const pending = ensureCodexCli({...options, installCodex: true})
  const rejected = expect(pending).rejects.toThrow('Codex CLI installation failed')
  await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
  installation.emit('close', 1)
  await rejected
  expect(runCodex).toHaveBeenCalledTimes(1)
})
it('should report npm launch failure', async () => {
  const pending = ensureCodexCli({...options, installCodex: true})
  const rejected = expect(pending).rejects.toThrow('npm')
  await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
  installation.emit('error', new Error('npm missing'))
  await rejected
})
it('should stop if the installed CLI is still unavailable', async () => {
  vi.mocked(runCodex).mockReset().mockRejectedValue(missing)
  const pending = ensureCodexCli({...options, installCodex: true})
  const rejected = expect(pending).rejects.toThrow('PATH')
  await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
  installation.emit('close', 0)
  await rejected
})
it('should close the prompt on cancellation', async () => {
  question.mockRejectedValue(new Error('cancelled'))
  await expect(ensureCodexCli(options)).rejects.toThrow('cancelled')
  expect(close).toHaveBeenCalledOnce()
  expect(spawn).not.toHaveBeenCalled()
})
