import {beforeEach, expect, it, vi} from 'vitest'
import {installTargets} from '../install-targets'
import {installPlugin} from '../install-plugin'
import {installClaudePlugin} from '../install-claude-plugin'

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
    'Codex 설치 완료. Claude 설치 실패: Claude CLI missing',
  )
})
