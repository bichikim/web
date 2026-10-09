import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRustNavigation} from '../create-rust-navigation'
const {createRustService, lookupSymbols, dispose} = vi.hoisted(() => {
  const lookupSymbols = vi.fn()
  const dispose = vi.fn()
  return {createRustService: vi.fn(() => ({dispose, lookupSymbols})), dispose, lookupSymbols}
})
vi.mock('../create-rust-service', () => ({createRustService}))

describe('createRustNavigation', () => {
  let root: string
  let navigation: ReturnType<typeof createRustNavigation>
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'rust-navigation-')))
    mkdirSync(join(root, 'crate/src'), {recursive: true})
    writeFileSync(join(root, 'crate/Cargo.toml'), '[package]\nname = "example"\nedition = "2021"\n')
    writeFileSync(join(root, 'crate/src/main.rs'), 'fn main() {}')
    writeFileSync(join(root, 'crate/src/module.rs'), 'pub fn answer() {}')
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [{column: 8, line: 1, path: join(root, 'crate/src/module.rs')}],
    })
    navigation = createRustNavigation(root)
  })
  afterEach(() => {
    navigation.dispose()
    rmSync(root, {force: true, recursive: true})
    vi.clearAllMocks()
  })
  it('should reuse an analyzer for a Cargo project and return workspace-relative targets', async () => {
    expect(
      await navigation.lookupSymbols(
        join(root, 'crate/src/main.rs'),
        'fn main() {}',
        3,
        'definition',
      ),
    ).toEqual({ok: true, value: [{column: 8, line: 1, path: 'crate/src/module.rs'}]})
    await navigation.lookupSymbols(
      join(root, 'crate/src/module.rs'),
      'pub fn answer() {}',
      7,
      'definition',
    )
    expect(createRustService).toHaveBeenCalledOnce()
    expect(createRustService).toHaveBeenCalledWith(
      expect.objectContaining({
        crates: [expect.objectContaining({root_module: join(root, 'crate/src/main.rs')})],
        directory: join(root, 'crate'),
      }),
    )
    navigation.dispose()
    expect(dispose).toHaveBeenCalledOnce()
  })
  it('should exclude target paths outside the workspace or hidden directories', async () => {
    lookupSymbols.mockResolvedValue({
      ok: true,
      value: [
        {column: 1, line: 1, path: '/outside/module.rs'},
        {column: 1, line: 1, path: join(root, '.git/module.rs')},
      ],
    })
    expect(
      await navigation.lookupSymbols(join(root, 'crate/src/main.rs'), 'main()', 0, 'definition'),
    ).toEqual({
      ok: true,
      value: [],
    })
  })
  it('should support standalone Rust files without a Cargo manifest', async () => {
    writeFileSync(join(root, 'example.rs'), 'fn main() {}')
    await navigation.lookupSymbols(join(root, 'example.rs'), 'fn main() {}', 3, 'definition')
    expect(createRustService).toHaveBeenCalledWith(
      expect.objectContaining({
        crates: [expect.objectContaining({root_module: join(root, 'example.rs')})],
        directory: root,
      }),
    )
  })
  it('should propagate analyzer failures', async () => {
    lookupSymbols.mockResolvedValue({error: {code: 'rust-analyzer-unavailable'}, ok: false})
    expect(
      await navigation.lookupSymbols(join(root, 'crate/src/main.rs'), 'main()', 0, 'definition'),
    ).toEqual({
      error: {code: 'rust-analyzer-unavailable'},
      ok: false,
    })
  })
  it('should replace the analyzer when the local crate graph changes', async () => {
    await navigation.lookupSymbols(join(root, 'crate/src/main.rs'), 'fn main() {}', 3, 'definition')
    writeFileSync(join(root, 'crate/src/lib.rs'), 'pub fn answer() {}')
    await navigation.lookupSymbols(join(root, 'crate/src/main.rs'), 'fn main() {}', 3, 'definition')
    expect(dispose).toHaveBeenCalledOnce()
    expect(createRustService).toHaveBeenCalledTimes(2)
  })
  it('should reuse the workspace analyzer when navigating between different member crates', async () => {
    writeFileSync(join(root, 'Cargo.toml'), '[workspace]\nmembers = ["crate", "helper"]\n')
    mkdirSync(join(root, 'helper/src'), {recursive: true})
    writeFileSync(join(root, 'helper/Cargo.toml'), '[package]\nname = "helper"\nedition = "2021"\n')
    writeFileSync(join(root, 'helper/src/lib.rs'), 'pub fn answer() {}')
    await navigation.lookupSymbols(join(root, 'crate/src/main.rs'), 'fn main() {}', 3, 'definition')
    await navigation.lookupSymbols(
      join(root, 'helper/src/lib.rs'),
      'pub fn answer() {}',
      7,
      'definition',
    )
    expect(createRustService).toHaveBeenCalledOnce()
    expect(dispose).not.toHaveBeenCalled()
  })
  it('should reject navigation after disposal without starting another analyzer', async () => {
    navigation.dispose()
    expect(
      await navigation.lookupSymbols(
        join(root, 'crate/src/main.rs'),
        'fn main() {}',
        3,
        'definition',
      ),
    ).toEqual({
      error: {code: 'rust-analysis-failed'},
      ok: false,
    })
    expect(createRustService).not.toHaveBeenCalled()
  })
})
