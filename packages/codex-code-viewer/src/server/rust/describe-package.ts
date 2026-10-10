import {resolve} from 'node:path'
import type {RustManifest} from './parse-manifest'
import type {RustCrate, RustPackageDescription, RustTargetCandidate} from './types'

const defaultFeatures = (manifest: RustManifest): string[] => {
  const selected = new Set<string>()
  const visit = (name: string): void => {
    if (selected.has(name)) {
      return
    }
    selected.add(name)
    for (const child of manifest.features?.[name] ?? []) {
      visit(child)
    }
  }
  if (manifest.features?.default !== undefined) {
    visit('default')
  }
  return [...selected]
}

const discoverBinaries = (manifest: RustManifest, edition: RustCrate['edition']): boolean =>
  manifest.package?.autobins ??
  (edition !== '2015' ||
    [manifest.lib, manifest.bin, manifest.example, manifest.test, manifest.bench].every(
      (target) => target === undefined,
    ))

export interface DescribePackageOptions {
  readonly directory: string
  readonly manifest: RustManifest
  readonly cfg: readonly string[]
  readonly workspace: {
    readonly directory: string
    readonly manifest: RustManifest['workspace']
  }
}

/** Describes Cargo metadata and candidate paths from absolute package and workspace directories. */
export const describePackage = (
  options: DescribePackageOptions,
): RustPackageDescription | undefined => {
  const {directory, manifest, cfg, workspace} = options
  const metadata = manifest.package
  if (metadata === undefined) {
    return undefined
  }
  const name = metadata.name.replaceAll('-', '_')
  const features = defaultFeatures(manifest)
  const edition: RustCrate['edition'] =
    typeof metadata.edition === 'string'
      ? metadata.edition
      : metadata.edition?.workspace === true
        ? (workspace.manifest?.package?.edition ?? '2015')
        : '2015'
  const target = (
    paths: readonly string[],
    kind: RustTargetCandidate['kind'],
    name: string,
  ): RustTargetCandidate => ({
    kind,
    name: name.replaceAll('-', '_'),
    paths: paths.map((path) => resolve(directory, path)),
  })
  const library =
    manifest.lib !== undefined || metadata.autolib !== false
      ? [target([manifest.lib?.path ?? 'src/lib.rs'], 'lib', manifest.lib?.name ?? name)]
      : []
  const binaries =
    manifest.bin?.map((entry) => {
      const binaryName = entry.name ?? metadata.name
      const paths =
        entry.path === undefined
          ? [
              ...(binaryName === metadata.name ? ['src/main.rs'] : []),
              `src/bin/${binaryName}.rs`,
              `src/bin/${binaryName}/main.rs`,
            ]
          : [entry.path]
      return target(paths, 'binary', binaryName)
    }) ?? []
  const dependencies = Object.entries(manifest.dependencies ?? {}).flatMap(([name, value]) => {
    if (typeof value === 'string') {
      return []
    }
    const inherited =
      value.workspace === true ? workspace.manifest?.dependencies?.[name] : undefined
    const dependency = typeof inherited === 'object' ? {...inherited, ...value} : value
    if (
      dependency.path === undefined ||
      (dependency.optional === true &&
        !features.includes(name) &&
        !features.includes(`dep:${name}`))
    ) {
      return []
    }
    const base = value.workspace === true ? workspace.directory : directory
    return [
      {
        manifest: resolve(base, dependency.path, 'Cargo.toml'),
        name: name.replaceAll('-', '_'),
        renamed: dependency.package !== undefined,
      },
    ]
  })
  return {
    automatic: discoverBinaries(manifest, edition)
      ? target(['src/main.rs'], 'binary', name)
      : undefined,
    cfg: [
      ...cfg,
      ...features
        .filter((feature) => !feature.includes(':') && !feature.includes('/'))
        .map((feature) => `feature="${feature}"`),
    ],
    dependencies,
    edition,
    targets: [...library, ...binaries],
  }
}
