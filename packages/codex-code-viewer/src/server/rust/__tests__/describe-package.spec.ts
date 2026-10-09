import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {describePackage} from '../describe-package'
import type {RustManifest} from '../parse-manifest'

describe('describePackage', () => {
  const directory = resolve('/workspace/app')
  const workspace = {directory: resolve('/workspace'), manifest: undefined}
  const describeLocal = (manifest: RustManifest) =>
    describePackage({cfg: ['unix'], directory, manifest, workspace})

  it('should return no package for a virtual workspace', () => {
    expect(describeLocal({workspace: {members: ['app']}})).toBeUndefined()
  })
  it('should describe configured roots and binary path alternatives without reading files', () => {
    expect(
      describeLocal({
        bin: [{name: 'app'}, {name: 'tool'}, {name: 'custom', path: 'code/run.rs'}],
        lib: {name: 'app-lib', path: 'code/lib.rs'},
        package: {autobins: false, edition: '2024', name: 'app'},
      }),
    ).toMatchObject({
      automatic: undefined,
      edition: '2024',
      targets: [
        {kind: 'lib', name: 'app_lib', paths: [resolve(directory, 'code/lib.rs')]},
        {
          kind: 'binary',
          name: 'app',
          paths: ['src/main.rs', 'src/bin/app.rs', 'src/bin/app/main.rs'].map((path) =>
            resolve(directory, path),
          ),
        },
        {
          kind: 'binary',
          name: 'tool',
          paths: ['src/bin/tool.rs', 'src/bin/tool/main.rs'].map((path) =>
            resolve(directory, path),
          ),
        },
        {kind: 'binary', name: 'custom', paths: [resolve(directory, 'code/run.rs')]},
      ],
    })
  })
  it.each([
    {edition: '2015', enabled: false},
    {edition: '2021', enabled: true},
  ] as const)('should apply $edition automatic binary defaults', ({edition, enabled}) => {
    const result = describeLocal({lib: {path: 'code/lib.rs'}, package: {edition, name: 'app'}})
    expect(result?.automatic !== undefined).toBe(enabled)
  })
  it('should honor explicit automatic binary discovery in edition 2015', () => {
    expect(
      describeLocal({lib: {}, package: {autobins: true, autolib: false, name: 'app'}})?.automatic,
    ).toMatchObject({name: 'app', paths: [resolve(directory, 'src/main.rs')]})
  })
  it('should omit automatic library candidates when disabled', () => {
    expect(describeLocal({package: {autolib: false, name: 'app'}})?.targets).toEqual([])
  })
  it('should expand default feature cycles and include only enabled optional local dependencies', () => {
    const cfg = ['unix']
    const result = describePackage({
      cfg,
      directory,
      manifest: {
        dependencies: {
          helper: {optional: true, path: 'helper'},
          unused: {optional: true, path: 'unused'},
          versioned: '1.0',
        },
        features: {default: ['extra'], extra: ['default', 'dep:helper']},
        package: {name: 'app'},
      },
      workspace,
    })
    expect(result?.dependencies).toEqual([
      {manifest: resolve(directory, 'helper/Cargo.toml'), name: 'helper', renamed: false},
    ])
    expect(result?.cfg).toEqual(['unix', 'feature="default"', 'feature="extra"'])
    expect(cfg).toEqual(['unix'])
  })
  it('should resolve inherited edition and renamed dependency paths against the workspace', () => {
    expect(
      describePackage({
        cfg: [],
        directory,
        manifest: {
          dependencies: {util: {workspace: true}},
          package: {edition: {workspace: true}, name: 'app'},
        },
        workspace: {
          directory: resolve('/workspace'),
          manifest: {
            dependencies: {util: {package: 'helper-lib', path: 'helper'}},
            package: {edition: '2024'},
          },
        },
      }),
    ).toMatchObject({
      dependencies: [
        {manifest: resolve('/workspace/helper/Cargo.toml'), name: 'util', renamed: true},
      ],
      edition: '2024',
    })
  })
})
