import {beforeEach, describe, expect, it, vi} from 'vitest'
import {failure, success} from '../../shared/contracts'
import {collectAliasedReferences} from '../collect-aliased-references'
import {readSource, resolveFile} from '../file-access'
import {readPythonImportAliases} from '../read-python-import-aliases'

vi.mock('../file-access', () => ({readSource: vi.fn(), resolveFile: vi.fn()}))
const alias = {column: 20, line: 1, path: '/workspace/bridge.py'}
const source = 'from helper import greet as exported\n'
const query = vi.fn()
const options = () => ({
  locations: [alias],
  lookup: {kind: 'references' as const},
  path: '/workspace/helper.py',
  query,
  readAliases: readPythonImportAliases,
  root: '/workspace',
  source: 'def greet(): pass',
})

describe('collectAliasedReferences', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(resolveFile).mockImplementation((_root, path) => success(path))
    vi.mocked(readSource).mockReturnValue(success(source))
  })
  it('should follow reexports, terminate cycles and deduplicate semantic locations', async () => {
    const next = {column: 20, line: 1, path: '/workspace/caller.py'}
    const call = {column: 1, line: 2, path: next.path}
    vi.mocked(readSource).mockImplementation((_root, path) =>
      success(path === next.path ? 'from bridge import exported as welcome\nwelcome()' : source),
    )
    query
      .mockResolvedValueOnce(success([alias, next]))
      .mockResolvedValueOnce(success([alias, call, call]))
    expect(await collectAliasedReferences(options())).toEqual(
      success([
        alias,
        {column: 29, line: 1, path: alias.path},
        next,
        {column: 32, line: 1, path: next.path},
        call,
      ]),
    )
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      [alias.path, source, source.indexOf('exported')],
      [next.path, 'from bridge import exported as welcome\nwelcome()', 31],
    ])
  })
  it('should skip aliases whose bindings are covered by a completed semantic search', async () => {
    const next = {column: 20, line: 1, path: '/workspace/caller.py'}
    const firstBinding = {column: 29, line: 1, path: alias.path}
    const nextBinding = {column: 29, line: 1, path: next.path}
    const firstCall = {column: 1, line: 2, path: alias.path}
    const nextCall = {column: 1, line: 2, path: next.path}
    query.mockResolvedValue(success([firstCall, nextBinding, nextCall]))
    expect(await collectAliasedReferences({...options(), locations: [alias, next]})).toEqual(
      success([alias, next, firstBinding, firstCall, nextBinding, nextCall]),
    )
    expect(query).toHaveBeenCalledOnce()
  })
  it('should stop a cancelled lookup before reading alias sources', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      collectAliasedReferences({
        ...options(),
        lookup: {kind: 'references', signal: controller.signal},
      }),
    ).rejects.toThrow()
    expect(query).not.toHaveBeenCalled()
    expect(readSource).not.toHaveBeenCalled()
  })
  it('should propagate analyzer failures instead of returning incomplete references', async () => {
    query.mockResolvedValue(failure('python-analysis-failed'))
    expect(await collectAliasedReferences(options())).toEqual(failure('python-analysis-failed'))
  })
  it('should propagate unreadable workspace sources instead of caching partial results', async () => {
    vi.mocked(readSource).mockReturnValue(failure('not-found'))
    expect(await collectAliasedReferences(options())).toEqual(failure('not-found'))
    expect(query).not.toHaveBeenCalled()
  })
})
