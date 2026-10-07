import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRustNavigation} from '../create-rust-navigation'
const {createRustService, definitions, dispose} = vi.hoisted(() => {
  const definitions = vi.fn()
  const dispose = vi.fn()
  return {createRustService: vi.fn(() => ({definitions, dispose})), definitions, dispose}
})
vi.mock('../create-rust-service', () => ({createRustService}))

describe('createRustNavigation', () => {
  let root: string
  let navigation: ReturnType<typeof createRustNavigation>
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'rust-navigation-')))
    mkdirSync(join(root, 'crate/src'), {recursive: true})
    writeFileSync(join(root, 'crate/Cargo.toml'), '')
    writeFileSync(join(root, 'crate/src/main.rs'), 'fn main() {}')
    writeFileSync(join(root, 'crate/src/module.rs'), 'pub fn answer() {}')
    definitions.mockResolvedValue({
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
      await navigation.definitions(join(root, 'crate/src/main.rs'), 'fn main() {}', 3),
    ).toEqual({ok: true, value: [{column: 8, line: 1, path: 'crate/src/module.rs'}]})
    await navigation.definitions(join(root, 'crate/src/module.rs'), 'pub fn answer() {}', 7)
    expect(createRustService).toHaveBeenCalledOnce()
    expect(createRustService).toHaveBeenCalledWith({
      directory: join(root, 'crate'),
      file: join(root, 'crate/src/main.rs'),
      manifest: true,
    })
    navigation.dispose()
    expect(dispose).toHaveBeenCalledOnce()
  })
  it('should exclude target paths outside the workspace or hidden directories', async () => {
    definitions.mockResolvedValue({
      ok: true,
      value: [
        {column: 1, line: 1, path: '/outside/module.rs'},
        {column: 1, line: 1, path: join(root, '.git/module.rs')},
      ],
    })
    expect(await navigation.definitions(join(root, 'crate/src/main.rs'), 'main()', 0)).toEqual({
      ok: true,
      value: [],
    })
  })
  it('should support standalone Rust files without a Cargo manifest', async () => {
    writeFileSync(join(root, 'example.rs'), 'fn main() {}')
    await navigation.definitions(join(root, 'example.rs'), 'fn main() {}', 3)
    expect(createRustService).toHaveBeenCalledWith({
      directory: root,
      file: join(root, 'example.rs'),
      manifest: false,
    })
  })
  it('should propagate analyzer failures', async () => {
    definitions.mockResolvedValue({error: {code: 'rust-analyzer-unavailable'}, ok: false})
    expect(await navigation.definitions(join(root, 'crate/src/main.rs'), 'main()', 0)).toEqual({
      error: {code: 'rust-analyzer-unavailable'},
      ok: false,
    })
  })
})
