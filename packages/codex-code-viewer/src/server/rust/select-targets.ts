import {basename, dirname} from 'node:path'
import type {RustTarget, RustTargetCandidate} from './types'

interface SelectTargetsOptions {
  readonly configured: readonly RustTargetCandidate[]
  readonly automatic: RustTargetCandidate | undefined
  readonly binaries: readonly string[]
  readonly files: ReadonlyMap<string, string>
}

/** Selects available source roots with configured binaries taking precedence over discovery. */
export const selectTargets = (options: SelectTargetsOptions): RustTarget[] => {
  const {configured, automatic, binaries, files} = options
  const select = (candidate: RustTargetCandidate): RustTarget[] => {
    const path = candidate.paths.map((path) => files.get(path)).find((path) => path !== undefined)
    return path === undefined ? [] : [{kind: candidate.kind, name: candidate.name, path}]
  }
  const explicit = configured.flatMap(select)
  const inferred =
    automatic === undefined
      ? []
      : [
          ...select(automatic),
          ...binaries.flatMap((path) =>
            select({
              kind: 'binary',
              name: (basename(path) === 'main.rs'
                ? basename(dirname(path))
                : basename(path, '.rs')
              ).replaceAll('-', '_'),
              paths: [path],
            }),
          ),
        ].filter(
          (entry) =>
            !explicit.some(
              (configured) => configured.kind === 'binary' && configured.name === entry.name,
            ),
        )
  return [...explicit, ...inferred].filter(
    (entry, index, all) => all.findIndex((candidate) => candidate.path === entry.path) === index,
  )
}
