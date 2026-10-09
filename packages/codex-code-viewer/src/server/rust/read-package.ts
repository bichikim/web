import {globSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {resolveFile} from '../file-access'
import {describePackage, type DescribePackageOptions} from './describe-package'
import {selectTargets} from './select-targets'
import type {RustPackage} from './types'

interface ReadPackageOptions extends DescribePackageOptions {
  readonly root: string
}

/** Resolves a package description's source roots and dependencies within the workspace boundary. */
export const readPackage = (options: ReadPackageOptions): RustPackage | undefined => {
  const {root, directory} = options
  const description = describePackage(options)
  if (description === undefined) {
    return undefined
  }
  const binaries =
    description.automatic === undefined
      ? []
      : globSync(['src/bin/*.rs', 'src/bin/*/main.rs'], {cwd: directory}).map((path) =>
          resolve(directory, path),
        )
  const paths = [
    ...description.targets.flatMap((target) => target.paths),
    ...(description.automatic?.paths ?? []),
    ...binaries,
  ]
  const files = new Map(
    paths.flatMap((path) => {
      const resolved = resolveFile(root, path)
      return resolved.ok ? [[path, resolved.value] as const] : []
    }),
  )
  const targets = selectTargets({
    automatic: description.automatic,
    binaries,
    configured: description.targets,
    files,
  })
  const dependencies = description.dependencies.flatMap((dependency) => {
    const resolved = resolveFile(root, dependency.manifest)
    return resolved.ok
      ? [{directory: dirname(resolved.value), name: dependency.name, renamed: dependency.renamed}]
      : []
  })
  return {cfg: description.cfg, dependencies, directory, edition: description.edition, targets}
}
