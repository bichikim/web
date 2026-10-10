import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {z} from 'zod'
import {
  type CodeLocation,
  type CodeSource,
  type CodeToken,
  navigationSchema,
  streamEndpointSchema,
  type ViewerSession,
} from '../shared/contracts'
import {createSessionRequest} from './create-session-request'
import type {NavigationPoint, ReferenceChoices, ViewerPort} from './types'
import type {useLatestRequest} from './use-latest-request'
import {readNavigationStream} from './read-navigation-stream'

interface DefinitionNavigationOptions {
  readonly onOpen: (location: CodeLocation) => Promise<void>
  readonly port: ViewerPort
  readonly run: ReturnType<typeof useLatestRequest>['run']
  readonly session: Accessor<ViewerSession | null>
  readonly sources?: Accessor<readonly CodeSource[]>
  readonly revision?: Accessor<string>
  readonly onError?: (error: unknown) => void
}
export interface DefinitionFeedback {
  readonly kind: 'missing' | 'choose'
}
interface DefinitionNavigation {
  readonly references: Accessor<ReferenceChoices | null>
  readonly choices: Accessor<CodeLocation[]>
  readonly feedback: Accessor<DefinitionFeedback | null>
  dismissFeedback(): void
  dismissReferences(): void
  follow(token: CodeToken, point?: NavigationPoint): Promise<void>
  reset(): void
}
interface NavigationSnapshot {
  readonly session: string
  readonly path: string
  readonly revision: string
  readonly sources: readonly CodeSource[]
}

const sameNavigation = (before: NavigationSnapshot, after: NavigationSnapshot | null): boolean => {
  if (
    after === null ||
    after.session !== before.session ||
    after.path !== before.path ||
    after.revision !== before.revision
  ) {
    return false
  }
  const sources = new Map(after.sources.map((entry) => [entry.path, entry.source]))
  return (
    before.sources.length === sources.size &&
    before.sources.every((entry) => sources.get(entry.path) === entry.source)
  )
}

/** Follows a unique definition or exposes destinations and unresolved/ambiguous result feedback. */
export const useDefinitionNavigation = (
  options: DefinitionNavigationOptions,
): DefinitionNavigation => {
  const [references, setReferences] = createSignal<ReferenceChoices | null>(null)
  const [choices, setChoices] = createSignal<CodeLocation[]>([])
  const [feedback, setFeedback] = createSignal<DefinitionFeedback | null>(null)
  const request = createSessionRequest(options)
  let controller: AbortController | null = null
  let origin: NavigationSnapshot | null = null
  const dismissReferences = (): void => {
    controller?.abort()
    controller = null
    setReferences(null)
  }
  const snapshot = (): NavigationSnapshot | null => {
    const current = options.session()
    return current === null
      ? null
      : {
          path: current.document.location.path,
          revision: options.revision?.() ?? current.document.revision,
          session: current.session,
          sources: options.sources?.() ?? [],
        }
  }
  createEffect(() => {
    const current = snapshot()
    if (origin !== null && !sameNavigation(origin, current)) {
      dismissReferences()
    }
  })
  onCleanup(dismissReferences)
  const showDefinitions = async (
    locations: CodeLocation[],
    label: string,
    point: NavigationPoint,
  ): Promise<void> => {
    dismissReferences()
    const [location] = locations
    if (locations.length === 1 && location !== undefined) {
      await options.onOpen(location)
    } else {
      setChoices(locations)
      setFeedback({kind: location === undefined ? 'missing' : 'choose'})
      if (locations.length > 1) {
        setReferences({kind: 'definition', label, locations, point})
      }
    }
  }
  const follow = async (
    token: CodeToken,
    point: NavigationPoint = {x: 16, y: 80},
  ): Promise<void> => {
    const current = snapshot()
    if (current === null || token.navigation === null) {
      return
    }
    dismissReferences()
    setChoices([])
    setFeedback(null)
    const operation = new AbortController()
    controller = operation
    origin = current
    const result = await options.run(() =>
      request(
        'code.navigate',
        {
          navigation: token.navigation,
          offset: token.offset,
          path: current.path,
          revision: current.revision,
          stream: true,
          ...(options.sources === undefined ? {} : {sources: current.sources}),
        },
        z.union([streamEndpointSchema, navigationSchema]),
      ),
    )
    if (operation.signal.aborted) {
      return
    }
    if (result === null || !sameNavigation(current, snapshot())) {
      dismissReferences()
      return
    }
    if ('url' in result) {
      try {
        const definition = await readNavigationStream({
          receive: (locations) => {
            if (!sameNavigation(current, snapshot())) {
              operation.abort()
              return
            }
            setReferences((previous) => ({
              label: token.text,
              locations: [...(previous?.locations ?? []), ...locations],
              point,
              status: 'searching',
            }))
          },
          signal: operation.signal,
          url: result.url,
        })
        if (definition === null) {
          setReferences((previous) =>
            previous === null ? null : {...previous, status: 'complete'},
          )
        } else {
          await showDefinitions(definition.locations, token.text, point)
        }
      } catch (error) {
        if (!operation.signal.aborted) {
          setReferences((previous) => (previous === null ? null : {...previous, status: 'failed'}))
          options.onError?.(error)
        }
      }
      return
    }
    if (result.kind === 'references') {
      setReferences({label: token.text, locations: result.locations, point})
      return
    }
    await showDefinitions(result.locations, token.text, point)
  }
  return {
    choices,
    dismissFeedback: () => setFeedback(null),
    dismissReferences,
    feedback,
    follow,
    references,
    reset: () => {
      setChoices([])
      dismissReferences()
    },
  }
}
