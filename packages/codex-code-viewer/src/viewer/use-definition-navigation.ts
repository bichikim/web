import {type Accessor, createSignal} from 'solid-js'
import {
  type CodeLocation,
  type CodeToken,
  navigationSchema,
  type ViewerSession,
} from '../shared/contracts'
import {createSessionRequest} from './create-session-request'
import type {ViewerPort} from './types'
import type {useLatestRequest} from './use-latest-request'

interface DefinitionNavigationOptions {
  readonly onOpen: (location: CodeLocation) => Promise<void>
  readonly port: ViewerPort
  readonly run: ReturnType<typeof useLatestRequest>['run']
  readonly session: Accessor<ViewerSession | null>
}
export interface DefinitionFeedback {
  readonly kind: 'missing' | 'choose'
}
interface DefinitionNavigation {
  readonly choices: Accessor<CodeLocation[]>
  readonly feedback: Accessor<DefinitionFeedback | null>
  dismissFeedback(): void
  follow(token: CodeToken): Promise<void>
  reset(): void
}

/** Follows a unique definition or exposes destinations and unresolved/ambiguous result feedback. */
export const useDefinitionNavigation = (
  options: DefinitionNavigationOptions,
): DefinitionNavigation => {
  const [choices, setChoices] = createSignal<CodeLocation[]>([])
  const [feedback, setFeedback] = createSignal<DefinitionFeedback | null>(null)
  const request = createSessionRequest(options)
  const follow = async (token: CodeToken): Promise<void> => {
    const current = options.session()
    if (current === null || token.navigation === null) {
      return
    }
    const result = await options.run(() =>
      request(
        'code.navigate',
        {
          navigation: token.navigation,
          offset: token.offset,
          path: current.document.location.path,
          revision: current.document.revision,
        },
        navigationSchema,
      ),
    )
    if (result === null) {
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
    reset: () => setChoices([]),
  }
}
