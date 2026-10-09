import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createPythonService} from '../create-python-service'
import {createPythonNavigation} from '../create-python-navigation'

vi.mock('../create-python-service', () => ({createPythonService: vi.fn()}))
describe('createPythonNavigation', () => {
  let root: string
  let navigation: ReturnType<typeof createPythonNavigation>
  const lookupSymbols = vi.fn()
  const dispose = vi.fn()
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'python-navigation-')))
    writeFileSync(join(root, 'main.py'), 'greet()')
    writeFileSync(join(root, 'helper.py'), 'def greet(): pass')
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [{column: 5, line: 1, path: join(root, 'helper.py')}],
    })
    vi.mocked(createPythonService).mockReturnValue({dispose, lookupSymbols})
    navigation = createPythonNavigation(root)
  })
  afterEach(() => {
    navigation.dispose()
    rmSync(root, {force: true, recursive: true})
    vi.resetAllMocks()
  })
  it('should start lazily, reuse the analyzer and release it without restarting a closed session', async () => {
    expect(createPythonService).not.toHaveBeenCalled()
    expect(
      await navigation.lookupSymbols(join(root, 'main.py'), 'greet()', 0, 'definition'),
    ).toEqual({
      ok: true,
      value: [{column: 5, line: 1, path: 'helper.py'}],
    })
    await navigation.lookupSymbols(join(root, 'helper.py'), 'greet()', 0, 'definition')
    expect(createPythonService).toHaveBeenCalledOnce()
    navigation.dispose()
    expect(
      await navigation.lookupSymbols(join(root, 'main.py'), 'greet()', 0, 'definition'),
    ).toMatchObject({
      error: {code: 'python-analysis-failed'},
      ok: false,
    })
    expect(createPythonService).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
  })
  it('should filter unavailable and external destinations before returning workspace-relative locations', async () => {
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [
        {column: 1, line: 1, path: '/outside/module.py'},
        {column: 1, line: 1, path: join(root, '.git/secret.py')},
        {column: 1, line: 1, path: join(root, 'missing.py')},
      ],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.py'), 'greet()', 0, 'definition'),
    ).toEqual({
      ok: true,
      value: [],
    })
  })
  it('should report analyzer startup failures without affecting document reads', async () => {
    vi.mocked(createPythonService).mockImplementation(() => {
      throw new Error('missing runtime')
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.py'), 'greet()', 0, 'definition'),
    ).toMatchObject({
      error: {code: 'python-analyzer-unavailable'},
      ok: false,
    })
  })
})
