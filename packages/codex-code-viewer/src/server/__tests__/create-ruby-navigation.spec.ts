import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRubyService} from '../create-ruby-service'
import {createRubyNavigation} from '../create-ruby-navigation'

vi.mock('../create-ruby-service', () => ({createRubyService: vi.fn()}))
describe('createRubyNavigation', () => {
  let root: string
  let navigation: ReturnType<typeof createRubyNavigation>
  const lookupSymbols = vi.fn()
  const dispose = vi.fn()
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'ruby-navigation-')))
    writeFileSync(join(root, 'main.rb'), 'greet()')
    writeFileSync(join(root, 'helper.rb'), 'def greet; end')
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [{column: 5, line: 1, path: join(root, 'helper.rb')}],
    })
    vi.mocked(createRubyService).mockReturnValue({dispose, lookupSymbols, update: vi.fn()})
    navigation = createRubyNavigation(root)
  })
  afterEach(() => {
    navigation.dispose()
    rmSync(root, {force: true, recursive: true})
    vi.resetAllMocks()
  })
  it('should start lazily, reuse the analyzer and release it without restarting a closed session', async () => {
    expect(createRubyService).not.toHaveBeenCalled()
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'definition'}),
    ).toEqual({
      ok: true,
      value: [{column: 5, line: 1, path: 'helper.rb'}],
    })
    await navigation.lookupSymbols(join(root, 'helper.rb'), 'greet()', 0, {kind: 'definition'})
    expect(createRubyService).toHaveBeenCalledOnce()
    navigation.dispose()
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'definition'}),
    ).toMatchObject({
      error: {code: 'ruby-analysis-failed'},
      ok: false,
    })
    expect(createRubyService).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
  })
  it('should filter unavailable and external destinations before returning workspace-relative locations', async () => {
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [
        {column: 1, line: 1, path: '/outside/module.rb'},
        {column: 1, line: 1, path: join(root, '.git/secret.rb')},
        {column: 1, line: 1, path: join(root, 'missing.rb')},
      ],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'definition'}),
    ).toEqual({
      ok: true,
      value: [],
    })
  })
  it('should report analyzer startup failures without affecting document reads', async () => {
    vi.mocked(createRubyService).mockImplementation(() => {
      throw new Error('missing runtime')
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'definition'}),
    ).toMatchObject({
      error: {code: 'ruby-analyzer-unavailable'},
      ok: false,
    })
  })
  it('should convert returned codepoint columns to viewer UTF-16 columns', async () => {
    writeFileSync(join(root, 'helper.rb'), '"🦊"; def greet; end')
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [{column: 10, line: 1, path: join(root, 'helper.rb')}],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'definition'}),
    ).toEqual({
      ok: true,
      value: [{column: 11, line: 1, path: 'helper.rb'}],
    })
  })
  it('should exclude declarations while retaining calls on the same line', async () => {
    writeFileSync(join(root, 'helper.rb'), 'def self.greet; greet; end')
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [
        {column: 10, line: 1, path: join(root, 'helper.rb')},
        {column: 17, line: 1, path: join(root, 'helper.rb')},
      ],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), 'greet()', 0, {kind: 'references'}),
    ).toEqual({
      ok: true,
      value: [{column: 17, line: 1, path: 'helper.rb'}],
    })
  })
  it('should convert a draft definition column against its edited Unicode source', async () => {
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [{column: 10, line: 1, path: join(root, 'helper.rb')}],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'helper.rb'), '"🦊"; def greet; end', 11, {
        draft: true,
        kind: 'definition',
      }),
    ).toEqual({
      ok: true,
      value: [{column: 11, line: 1, path: 'helper.rb'}],
    })
  })
  it.each(['class Helper::Report; end', 'def Helper.greet; end'])(
    'should retain namespace and receiver usages in %s',
    async (source) => {
      writeFileSync(join(root, 'helper.rb'), source)
      const column = source.indexOf('Helper') + 1
      lookupSymbols.mockResolvedValue({
        ok: true,
        value: [{column, line: 1, path: join(root, 'helper.rb')}],
      })
      expect(
        await navigation.lookupSymbols(join(root, 'main.rb'), 'Helper', 0, {kind: 'references'}),
      ).toEqual({
        ok: true,
        value: [{column, line: 1, path: 'helper.rb'}],
      })
    },
  )
  it('should follow static relative requires without starting an analyzer', async () => {
    const source = "require_relative 'helper'"
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), source, source.indexOf('helper'), {
        kind: 'definition',
      }),
    ).toEqual({
      ok: true,
      value: [{column: 1, line: 1, path: 'helper.rb'}],
    })
    expect(createRubyService).not.toHaveBeenCalled()
    const outside = "require_relative '../outside'"
    expect(
      await navigation.lookupSymbols(join(root, 'main.rb'), outside, outside.indexOf('../'), {
        kind: 'definition',
      }),
    ).toEqual({ok: true, value: []})
  })
  it('should reuse a service per nested Gemfile project while keeping workspace-relative paths', async () => {
    mkdirSync(join(root, 'first/lib'), {recursive: true})
    mkdirSync(join(root, 'second/lib'), {recursive: true})
    writeFileSync(join(root, 'first/Gemfile'), '')
    writeFileSync(join(root, 'second/Gemfile'), '')
    await navigation.lookupSymbols(join(root, 'first/lib/main.rb'), 'greet()', 0, {
      kind: 'definition',
    })
    await navigation.lookupSymbols(join(root, 'first/lib/other.rb'), 'greet()', 0, {
      kind: 'definition',
    })
    await navigation.lookupSymbols(join(root, 'second/lib/main.rb'), 'greet()', 0, {
      kind: 'definition',
    })
    expect(createRubyService).toHaveBeenCalledTimes(2)
    expect(createRubyService).toHaveBeenNthCalledWith(1, join(root, 'first'))
    expect(createRubyService).toHaveBeenNthCalledWith(2, join(root, 'second'))
    navigation.dispose()
    expect(dispose).toHaveBeenCalledTimes(2)
  })
})
