import {mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {readProject} from '../read-project'

describe('readProject', () => {
  let root: string
  const write = (path: string, source: string) => {
    mkdirSync(join(root, path, '..'), {recursive: true})
    writeFileSync(join(root, path), source)
  }
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'rust-project-')))
  })
  afterEach(() => rmSync(root, {force: true, recursive: true}))

  it('should describe library and binary roots with the library as a binary dependency', () => {
    write('Cargo.toml', '[package]\nname = "my-app"\nedition = "2024"\n')
    write('src/lib.rs', 'pub fn answer() {}')
    write('src/main.rs', 'fn main() { my_app::answer(); }')
    const result = readProject({file: join(root, 'src/main.rs'), root})
    expect(result).toMatchObject({
      ok: true,
      value: {
        crates: [
          {
            deps: [],
            display_name: 'my_app',
            edition: '2024',
            root_module: join(root, 'src/lib.rs'),
          },
          {deps: [{crate: 0, name: 'my_app'}], root_module: join(root, 'src/main.rs')},
        ],
        directory: root,
      },
    })
  })

  it('should resolve workspace members and inherited dependency aliases', () => {
    write(
      'Cargo.toml',
      `[workspace]
members = ["crates/*"]
[workspace.package]
edition = "2021"
[workspace.dependencies]
helper = { path = "crates/helper", package = "helper-lib" }
`,
    )
    write(
      'crates/app/Cargo.toml',
      `[package]
name = "app"
edition.workspace = true
[dependencies]
helper.workspace = true
`,
    )
    write('crates/app/src/main.rs', 'fn main() { helper::answer(); }')
    write('crates/helper/Cargo.toml', '[package]\nname = "helper-lib"\nedition = "2021"\n')
    write('crates/helper/src/lib.rs', 'pub fn answer() {}')
    const result = readProject({file: join(root, 'crates/app/src/main.rs'), root})
    expect(result.ok).toBe(true)
    if (result.ok) {
      const helper = result.value.crates.findIndex((crate) => crate.display_name === 'helper_lib')
      expect(result.value.directory).toBe(root)
      expect(result.value.crates.find((crate) => crate.display_name === 'app')).toMatchObject({
        deps: [{crate: helper, name: 'helper'}],
        edition: '2021',
      })
    }
  })

  it('should honor explicit source roots, default features and local path dependencies', () => {
    write(
      'Cargo.toml',
      `[package]
name = "app"
autobins = false
[lib]
path = "code/root.rs"
[features]
default = ["extra"]
extra = ["dep:helper"]
[dependencies]
helper = {path = "helper", optional = true}
unused = {path = "unused", optional = true}
`,
    )
    write('code/root.rs', 'pub fn run() { helper::answer(); }')
    write('helper/Cargo.toml', '[package]\nname = "helper"\n')
    write('helper/src/lib.rs', 'pub fn answer() {}')
    const result = readProject({file: join(root, 'code/root.rs'), root})
    expect(result).toMatchObject({ok: true})
    if (result.ok) {
      expect(result.value.crates[0]).toMatchObject({
        cfg: expect.arrayContaining(['feature="extra"']),
        deps: [{crate: 1, name: 'helper'}],
        root_module: join(root, 'code/root.rs'),
      })
      expect(result.value.crates).toHaveLength(2)
    }
  })

  it('should use the same standalone root when a module is opened first', () => {
    write('main.rs', 'mod helper; fn main() { helper::answer(); }')
    write('helper.rs', 'pub fn answer() {}')
    expect(readProject({file: join(root, 'helper.rs'), root})).toMatchObject({
      ok: true,
      value: {crates: [{deps: [], root_module: join(root, 'main.rs')}]},
    })
  })

  it('should infer explicitly configured binaries when automatic discovery is disabled', () => {
    write(
      'Cargo.toml',
      '[package]\nname = "app"\nedition = "2021"\nautobins = false\n[[bin]]\nname = "app"\n[[bin]]\nname = "tool"\n',
    )
    write('src/main.rs', 'fn main() {}')
    write('src/bin/tool/main.rs', 'fn main() {}')
    expect(readProject({file: join(root, 'src/main.rs'), root})).toMatchObject({
      ok: true,
      value: {
        crates: [
          {root_module: join(root, 'src/main.rs')},
          {root_module: join(root, 'src/bin/tool/main.rs')},
        ],
      },
    })
  })

  it('should use a custom library name unless the dependency is explicitly renamed', () => {
    write(
      'Cargo.toml',
      `[package]
name = "app"
edition = "2021"
[dependencies]
helper = {path = "helper"}
renamed = {path = "helper", package = "helper"}
`,
    )
    write('src/main.rs', 'fn main() {}')
    write('helper/Cargo.toml', '[package]\nname = "helper"\n[lib]\nname = "custom_helper"\n')
    write('helper/src/lib.rs', 'pub fn answer() {}')
    expect(readProject({file: join(root, 'src/main.rs'), root})).toMatchObject({
      ok: true,
      value: {
        crates: [
          {
            deps: [
              {crate: 1, name: 'custom_helper'},
              {crate: 1, name: 'renamed'},
            ],
          },
          {display_name: 'custom_helper'},
        ],
      },
    })
  })

  it('should reject malformed manifests instead of guessing a Cargo graph', () => {
    write('Cargo.toml', '[package]\nname = ')
    write('src/main.rs', 'fn main() {}')
    expect(readProject({file: join(root, 'src/main.rs'), root})).toEqual({
      error: {code: 'rust-analysis-failed'},
      ok: false,
    })
  })

  it('should use explicit binary roots instead of discovering a second target with the same name', () => {
    write(
      'Cargo.toml',
      '[package]\nname = "app"\nedition = "2021"\n[[bin]]\nname = "app"\npath = "code/main.rs"\n',
    )
    write('code/main.rs', 'fn main() {}')
    write('src/main.rs', 'fn helper() {}')
    expect(readProject({file: join(root, 'code/main.rs'), root})).toMatchObject({
      ok: true,
      value: {crates: [{root_module: join(root, 'code/main.rs')}]},
    })
  })

  it('should honor edition 2015 default target discovery when targets are configured manually', () => {
    write('Cargo.toml', '[package]\nname = "app"\n[lib]\npath = "code/lib.rs"\n')
    write('code/lib.rs', 'pub fn run() {}')
    write('src/main.rs', 'fn main() {}')
    expect(readProject({file: join(root, 'code/lib.rs'), root})).toMatchObject({
      ok: true,
      value: {crates: [{root_module: join(root, 'code/lib.rs')}]},
    })
  })

  it('should preserve workspace inheritance for a path dependency in its own workspace', () => {
    write(
      'Cargo.toml',
      '[package]\nname = "app"\nedition = "2021"\n[dependencies]\nhelper = {path = "helper"}\n',
    )
    write('src/main.rs', 'fn main() {}')
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
    write('helper/src/lib.rs', 'pub fn run() { util::answer(); }')
    write('helper/util/Cargo.toml', '[package]\nname = "util"\nedition = "2021"\n')
    write('helper/util/src/lib.rs', 'pub fn answer() {}')
    const result = readProject({file: join(root, 'src/main.rs'), root})
    expect(result).toMatchObject({
      ok: true,
      value: {
        crates: [
          {deps: [{crate: 1, name: 'helper'}]},
          {deps: [{crate: 2, name: 'util'}], edition: '2024'},
          {display_name: 'util'},
        ],
      },
    })
  })

  it('should exclude path dependencies through symlinks outside the workspace', () => {
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'rust-outside-')))
    try {
      mkdirSync(join(outside, 'src'))
      writeFileSync(join(outside, 'Cargo.toml'), '[package]\nname = "secret"\n')
      writeFileSync(join(outside, 'src/lib.rs'), 'pub fn secret() {}')
      symlinkSync(outside, join(root, 'linked'), 'dir')
      write('Cargo.toml', '[package]\nname = "app"\n[dependencies]\nsecret = { path = "linked" }\n')
      write('src/main.rs', 'fn main() {}')
      const result = readProject({file: join(root, 'src/main.rs'), root})
      expect(result).toMatchObject({ok: true, value: {crates: [{deps: []}]}})
      if (result.ok) {
        expect(result.value.crates).toHaveLength(1)
      }
    } finally {
      rmSync(outside, {force: true, recursive: true})
    }
  })
})
