// oxlint-disable eslint-js/camelcase -- rust-project.json requires upstream wire field names.
import {join} from 'node:path'
import type {RustCrate, RustPackage, RustProject} from './types'

/** Describes local crate dependencies and source roots for rust-analyzer without Cargo. */
export const createProject = (directory: string, packages: readonly RustPackage[]): RustProject => {
  const targets = packages
    .toSorted((left, right) => left.directory.localeCompare(right.directory))
    .flatMap((entry) => entry.targets.map((target) => ({entry, target})))
  const libraries = new Map(
    targets.flatMap(({entry, target}, index) =>
      target.kind === 'lib' ? [[entry.directory, {index, name: target.name}] as const] : [],
    ),
  )
  const crates: RustCrate[] = targets.map(({entry, target}) => {
    const dependencies = entry.dependencies.flatMap((dependency) => {
      const library = libraries.get(dependency.directory)
      return library === undefined
        ? []
        : [{crate: library.index, name: dependency.renamed ? dependency.name : library.name}]
    })
    const library = libraries.get(entry.directory)
    const local =
      target.kind === 'binary' && library !== undefined
        ? [{crate: library.index, name: library.name}]
        : []
    return {
      cfg: entry.cfg,
      deps: [...dependencies, ...local],
      display_name: target.name,
      edition: entry.edition,
      is_workspace_member: true,
      root_module: target.path,
      source: {
        exclude_dirs: ['target', 'node_modules', '.git', '.codex', '.aws', '.ssh'].map((name) =>
          join(directory, name),
        ),
        include_dirs: [entry.directory],
      },
    }
  })
  return {crates, directory}
}
