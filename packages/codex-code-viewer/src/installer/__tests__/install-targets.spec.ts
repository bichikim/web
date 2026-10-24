import {beforeEach, expect, it, vi} from 'vitest'
import {ensureCodexCli} from '../ensure-codex-cli'
import {installTargets} from '../install-targets'
import {installPlugin} from '../install-plugin'
import {installClaudePlugin} from '../install-claude-plugin'

vi.mock('../ensure-codex-cli', () => ({ensureCodexCli: vi.fn()}))
vi.mock('../install-plugin', () => ({installPlugin: vi.fn()}))
vi.mock('../install-claude-plugin', () => ({installClaudePlugin: vi.fn()}))
beforeEach(() => vi.resetAllMocks())
const options = {
  claude: {binary: 'claude', home: '/claude', packageRoot: '/package', version: '1.0.0'},
  codex: {codex: 'codex', home: '/codex', version: '1.0.0'},
}

it('should install only the selected host', async () => {
  await installTargets({...options, target: 'codex'})
  expect(installPlugin).toHaveBeenCalledExactlyOnceWith(options.codex)
  expect(installClaudePlugin).not.toHaveBeenCalled()
})

it('should install Claude without touching Codex configuration', async () => {
  vi.mocked(installClaudePlugin).mockResolvedValue('/claude/helper.app')
  expect(await installTargets({...options, target: 'claude'})).toEqual([
    {application: '/claude/helper.app', target: 'claude'},
  ])
  expect(ensureCodexCli).not.toHaveBeenCalled()
  expect(installPlugin).not.toHaveBeenCalled()
})

it('should install both hosts and retain each successful result', async () => {
  vi.mocked(installClaudePlugin).mockResolvedValue('/claude/helper.app')
  expect(await installTargets({...options, target: 'all'})).toEqual([
    {target: 'codex'},
    {application: '/claude/helper.app', target: 'claude'},
  ])
})

it('should identify the installed host when the second host fails', async () => {
  vi.mocked(installClaudePlugin).mockRejectedValue(new Error('Claude CLI missing'))
  await expect(installTargets({...options, target: 'all'})).rejects.toThrow(
    'Codex installed. Claude installation failed: Claude CLI missing',
  )
})

it('should stop before plugin installation when CLI setup is declined or fails', async () => {
  vi.mocked(ensureCodexCli).mockRejectedValue(new Error('CLI setup stopped'))
  await expect(installTargets({...options, target: 'all'})).rejects.toThrow('CLI setup stopped')
  expect(installPlugin).not.toHaveBeenCalled()
  expect(installClaudePlugin).not.toHaveBeenCalled()
})
it('should pass explicit installation consent and terminal availability to CLI setup', async () => {
  await installTargets({...options, installCodex: true, interactive: false, target: 'codex'})
  expect(ensureCodexCli).toHaveBeenCalledExactlyOnceWith({
    codex: 'codex',
    home: '/codex',
    installCodex: true,
    interactive: false,
  })
})
