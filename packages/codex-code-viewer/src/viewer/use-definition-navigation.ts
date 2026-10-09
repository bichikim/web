import {type Accessor, createSignal} from 'solid-js'
import {
  type CodeLocation,
  type CodeSource,
  type CodeToken,
  navigationSchema,
  type ViewerSession,
} from '../shared/contracts'
import {createSessionRequest} from './create-session-request'
import type {NavigationPoint, ReferenceChoices, ViewerPort} from './types'
import type {useLatestRequest} from './use-latest-request'

interface DefinitionNavigationOptions {
  readonly onOpen: (location: CodeLocation) => Promise<void>
  readonly port: ViewerPort
  readonly run: ReturnType<typeof useLatestRequest>['run']
  readonly session: Accessor<ViewerSession | null>
  readonly sources?: Accessor<readonly CodeSource[]>
  readonly revision?: Accessor<string>
}
export interface DefinitionFeedback {
  readonly kind: 'missing' | 'choose'
}
interface DefinitionNavigation {
  readonly references: Accessor<ReferenceChoices | null>
  readonly choices: Accessor<CodeLocation[]>
  readonly feedback: Accessor<DefinitionFeedback | null>
  dismissFeedback(): void
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
  const follow = async (
    token: CodeToken,
    point: NavigationPoint = {x: 16, y: 80},
  ): Promise<void> => {
    const current = snapshot()
    if (current === null || token.navigation === null) {
      return
    }
    setReferences(null)
    setChoices([])
    setFeedback(null)
    const result = await options.run(() =>
      request(
        'code.navigate',
        {
          navigation: token.navigation,
          offset: token.offset,
          path: current.path,
          revision: current.revision,
          ...(options.sources === undefined ? {} : {sources: current.sources}),
        },
        navigationSchema,
      ),
    )
    if (result === null || !sameNavigation(current, snapshot())) {
      return
    }
    if (result.kind === 'references') {
      setReferences({label: token.text, locations: result.locations, point})
      return
    }
    const [location] = result.locations
    if (result.locations.length === 1 && location !== undefined) {
      await options.onOpen(location)
    } else {
      setChoices(result.locations)
      setFeedback({kind: location === undefined ? 'missing' : 'choose'})
    }
  }
  return {
    choices,
    dismissFeedback: () => setFeedback(null),
    feedback,
    follow,
    references,
    reset: () => {
      setChoices([])
      setReferences(null)
    },
  }
}
