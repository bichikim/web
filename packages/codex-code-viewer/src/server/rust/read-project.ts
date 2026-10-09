import {existsSync, globSync} from 'node:fs'
import {basename, dirname, join, resolve} from 'node:path'
import {parseManifest, type RustManifest} from './parse-manifest'
import {readPackage} from './read-package'
import {failure, type Result, success} from '../../shared/contracts'
import {isWithin, readSource, resolveFile} from '../file-access'
import {createProject} from './create-project'
import {createPlatformCfg} from './create-platform-cfg'
import type {RustPackage, RustProject} from './types'

const ancestors = (root: string, initial: string): string[] => {
  const paths: string[] = []
  let directory = initial
  while (isWithin(root, directory)) {
    paths.push(directory)
    if (directory === root) {
      return paths
    }
    directory = dirname(directory)
  }
  return paths
}

interface ReadProjectOptions {
  readonly root: string
  readonly file: string
}

/** Reads local Cargo or standalone source structure without invoking any Rust tools. */
export const readProject = (options: ReadProjectOptions): Result<RustProject> => {
  const {root, file} = options
  const source = resolveFile(root, file)
  if (!source.ok) {
    return source
  }
  const directories = ancestors(root, dirname(source.value))
  const nearest = directories.find((directory) => existsSync(join(directory, 'Cargo.toml')))
  const cfg = createPlatformCfg({architecture: process.arch, platform: process.platform})
  if (nearest === undefined) {
    const directory =
      directories.find((directory) =>
        ['lib.rs', 'main.rs'].some((name) => existsSync(join(directory, name))),
      ) ?? dirname(source.value)
    const paths = ['lib.rs', 'main.rs'].flatMap((name) => {
      const path = resolveFile(root, join(directory, name))
      return path.ok ? [path.value] : []
    })
    return success(
      createProject(directory, [
        {
          cfg,
          dependencies: [],
          directory,
          edition: '2021',
          targets: (paths.length === 0 ? [source.value] : paths).map((path) => ({
            kind: 'binary',
            name: basename(path, '.rs'),
            path,
          })),
        },
      ]),
    )
  }
  try {
    const manifests = new Map<string, RustManifest>()
    const readManifest = (directory: string): RustManifest => {
      const previous = manifests.get(directory)
      if (previous !== undefined) {
        return previous
      }
      const document = readSource(root, join(directory, 'Cargo.toml'))
      if (!document.ok) {
        throw new Error('Cannot read Cargo manifest')
      }
      const manifest = parseManifest(document.value)
      manifests.set(directory, manifest)
      return manifest
    }
    const workspaceFor = (directory: string, manifest: RustManifest): string => {
      if (manifest.workspace !== undefined) {
        return directory
      }
      const explicit = manifest.package?.workspace
      if (explicit !== undefined) {
        const path = resolveFile(root, resolve(directory, explicit, 'Cargo.toml'))
        if (!path.ok) {
          throw new Error('Cannot read Cargo workspace')
        }
        return dirname(path.value)
      }
      return (
        ancestors(root, directory).find(
          (parent) =>
            existsSync(join(parent, 'Cargo.toml')) && readManifest(parent).workspace !== undefined,
        ) ?? directory
      )
    }
    const directory = workspaceFor(nearest, readManifest(nearest))
    const shared = readManifest(directory).workspace
    const packages: RustPackage[] = []
    const visited = new Set<string>()
    const visit = (initial: string): void => {
      const resolved = resolveFile(root, join(initial, 'Cargo.toml'))
      if (!resolved.ok) {
        return
      }
      const directory = dirname(resolved.value)
      if (visited.has(directory)) {
        return
      }
      visited.add(directory)
      const manifest = readManifest(directory)
      const workspace = workspaceFor(directory, manifest)
      const entry = readPackage({
        cfg,
        directory,
        manifest,
        root,
        workspace: {directory: workspace, manifest: readManifest(workspace).workspace},
      })
      if (entry === undefined) {
        return
      }
      packages.push(entry)
      for (const dependency of entry.dependencies) {
        visit(dependency.directory)
      }
    }
    visit(nearest)
    if (directory !== nearest) {
      visit(directory)
    }
    for (const member of globSync(shared?.members ?? [], {
      cwd: directory,
      exclude: shared?.exclude ?? [],
    })) {
      visit(resolve(directory, member))
    }
    if (packages.every((entry) => entry.targets.length === 0)) {
      return failure('rust-analysis-failed')
    }
    return success(createProject(directory, packages))
  } catch {
    return failure('rust-analysis-failed')
  }
}
