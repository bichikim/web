import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createWorkspace} from '../create-workspace'
import {resolveNavigation} from '../resolve-navigation'

describe('createWorkspace embedded Rust navigation', () => {
  let root: string
  let workspace: ReturnType<typeof createWorkspace>
  const write = (path: string, source: string) => {
    mkdirSync(join(root, path, '..'), {recursive: true})
    writeFileSync(join(root, path), source)
  }
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'rust-embedded-')))
    write('.git/HEAD', 'ref: refs/heads/main')
    vi.stubEnv('PATH', join(root, 'missing-tools'))
    vi.stubEnv('CARGO', join(root, 'missing-cargo'))
    vi.stubEnv('RUSTC', join(root, 'missing-rustc'))
    vi.stubEnv('RUST_ANALYZER_BINARY', '')
    workspace = createWorkspace(root)
  })
  afterEach(() => {
    workspace.dispose()
    vi.unstubAllEnvs()
    rmSync(root, {force: true, recursive: true})
  })

  it('should find a Rust function usage across modules without a toolchain', async () => {
    write('main.rs', 'mod helper;\nfn main() { helper::answer(); }')
    write('helper.rs', 'pub fn answer() {}')
    const document = workspace.read('helper.rs')
    expect(document.ok).toBe(true)
    if (document.ok) {
      expect(
        await resolveNavigation({
          document: document.value,
          navigation: 'definition',
          offset: 9,
          path: 'helper.rs',
          workspace,
        }),
      ).toMatchObject({
        ok: true,
        value: {
          kind: 'references',
          locations: expect.arrayContaining([expect.objectContaining({line: 2, path: 'main.rs'})]),
        },
      })
    }

    expect(await workspace.references('helper.rs', 7)).toMatchObject({
      ok: true,
      value: expect.arrayContaining([expect.objectContaining({line: 2, path: 'main.rs'})]),
    })
  })
  it('should follow modules, imports and inferred methods without a Rust toolchain', async () => {
    const main =
      'mod helper;\nuse helper::Item;\nfn main() { let item = Item {}; item.answer(); }\n'
    write('Cargo.toml', '[package]\nname = "app"\nedition = "2021"\n')
    write('src/main.rs', main)
    write('src/helper.rs', 'pub struct Item {}\nimpl Item { pub fn answer(&self) -> i32 { 42 } }\n')
    expect(await workspace.definitions('src/main.rs', main.indexOf('helper'))).toMatchObject({
      ok: true,
      value: [{line: 1, path: 'src/helper.rs'}],
    })
    expect(await workspace.definitions('src/main.rs', main.lastIndexOf('Item'))).toMatchObject({
      ok: true,
      value: [{column: 12, line: 1, path: 'src/helper.rs'}],
    })
    expect(await workspace.definitions('src/main.rs', main.lastIndexOf('answer'))).toMatchObject({
      ok: true,
      value: [{line: 2, path: 'src/helper.rs'}],
    })
    const draft = main.replace('item.answer()', 'helper::Item {}.answer()')
    expect(
      await workspace.definitions('src/main.rs', draft.lastIndexOf('answer'), [
        {path: 'src/main.rs', source: draft},
      ]),
    ).toMatchObject({
      ok: true,
      value: [{line: 2, path: 'src/helper.rs'}],
    })
  })

  it('should follow workspace-inherited local dependencies and dependency aliases', async () => {
    write(
      'Cargo.toml',
      `[workspace]
members = ["app", "helper"]
[workspace.dependencies]
util = {path = "helper", package = "helper-lib"}
`,
    )
    write(
      'app/Cargo.toml',
      '[package]\nname = "app"\nedition = "2021"\n[dependencies]\nutil.workspace = true\n',
    )
    const main = 'fn main() { util::answer(); }'
    write('app/src/main.rs', main)
    write('helper/Cargo.toml', '[package]\nname = "helper-lib"\nedition = "2021"\n')
    write('helper/src/lib.rs', 'pub fn answer() -> i32 { 42 }')
    expect(await workspace.definitions('app/src/main.rs', main.indexOf('answer'))).toEqual({
      ok: true,
      value: [{column: 8, line: 1, path: 'helper/src/lib.rs'}],
    })
  })

  it('should navigate standalone files and reflect module changes', async () => {
    const main = 'mod helper;\nfn main() { helper::answer(); }'
    write('main.rs', main)
    write('helper.rs', 'pub fn answer() {}')
    expect(await workspace.definitions('main.rs', main.indexOf('answer'))).toEqual({
      ok: true,
      value: [{column: 8, line: 1, path: 'helper.rs'}],
    })
    write('helper.rs', '\n\npub fn answer() {}')
    // Deliver the changed document through the normal navigation boundary.
    await workspace.definitions('helper.rs', 9)
    expect(await workspace.definitions('main.rs', main.indexOf('answer'))).toEqual({
      ok: true,
      value: [{column: 8, line: 3, path: 'helper.rs'}],
    })
  })

  it('should infer methods through a dependency that inherits from its own workspace', async () => {
    write(
      'Cargo.toml',
      '[package]\nname = "app"\nedition = "2021"\n[dependencies]\nhelper = {path = "helper"}\n',
    )
    const main = 'fn main() { let item = helper::make(); item.answer(); }'
    write('src/main.rs', main)
    write(
      'helper/Cargo.toml',
      `[package]
name = "helper"
edition.workspace = true
[workspace]
[workspace.package]
edition = "2024"
[workspace.dependencies]
util = {path = "util"}
[dependencies]
util.workspace = true
`,
    )
    write('helper/src/lib.rs', 'pub fn make() -> util::Item { util::Item {} }')
    write('helper/util/Cargo.toml', '[package]\nname = "util"\nedition = "2021"\n')
    write(
      'helper/util/src/lib.rs',
      'pub struct Item {}\nimpl Item { pub fn answer(&self) -> i32 { 42 } }',
    )
    expect(await workspace.definitions('src/main.rs', main.indexOf('answer'))).toEqual({
      ok: true,
      value: [{column: 20, line: 2, path: 'helper/util/src/lib.rs'}],
    })
  })
})
