import type {createWorkspaceLinks} from './create-workspace-links'
import {locationKey} from './create-symbol-identities'
import type {NativeLocation, NativeOptions} from './types'

interface LocationSetOptions {
  readonly allowed: ReadonlySet<string>
  readonly definitions: readonly NativeLocation[]
  readonly receive: NativeOptions['receive']
  readonly workspace: ReturnType<typeof createWorkspaceLinks>
}

/** Deduplicates streamed locations within the viewer scope while excluding symbol definitions. */
export const createLocationSet = ({
  allowed,
  definitions,
  receive,
  workspace,
}: LocationSetOptions) => {
  const targets = new Set(definitions.map(locationKey))
  const excluded = new Set(targets)
  const found = new Map<string, NativeLocation>()
  return {
    exclude: (location: NativeLocation): void => {
      excluded.add(locationKey(location))
    },
    matches: (locations: readonly NativeLocation[]): boolean =>
      locations.some((location) => targets.has(locationKey(location))),
    publish: (locations: readonly NativeLocation[]): unknown => {
      const added: NativeLocation[] = []
      for (const location of locations) {
        const point = workspace.point(location)
        if (point !== undefined) {
          const normalized = workspace.location(point)
          const key = locationKey(normalized)
          if (allowed.has(normalized.path) && !excluded.has(key) && !found.has(key)) {
            found.set(key, normalized)
            added.push(normalized)
          }
        }
      }
      if (added.length > 0) {
        return receive(added)
      }
    },
    read: (): NativeLocation[] => [...found.values()],
  }
}
