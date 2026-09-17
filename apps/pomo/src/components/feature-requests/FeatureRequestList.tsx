import {createSignal, For, type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'

import type {AuthController} from '../../features/auth/controller'
import {type FeatureRequestsController} from '../../features/feature-requests'
import {PButton} from '../p-button/PButton'
import {PFormMessage} from '../p-form-message/PFormMessage'
import {FeatureRequestCard} from './FeatureRequestCard'

interface FeatureRequestListProps {
  readonly authentication: AuthController
  readonly model: FeatureRequestsController
  readonly newRequestAction: JSX.Element
}

export const FeatureRequestList = (props: FeatureRequestListProps) => {
  const [voteMessage, setVoteMessage] = createVoteMessage()
  const isAuthenticated = () => props.authentication.session() !== null

  const handleVote = async (requestId: string) => {
    setVoteMessage(null)
    const result = await props.model.voteRequest(requestId)

    switch (result.status) {
      case 'voted':
      case 'already-voted':
      case 'not-found':
        return
      case 'closed':
        setVoteMessage('closed')
        return
      case 'unauthorized':
        setVoteMessage('unauthorized')
        return
      case 'unavailable':
        setVoteMessage('failed')
        return
      default: {
        const exhaustiveResult: never = result
        return exhaustiveResult
      }
    }
  }

  return (
    <section aria-labelledby="feature-request-list-title" class="grid gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="m-0 text-base font-750" id="feature-request-list-title">
          {m.feature_request_list_title()}
        </h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">{props.model.requests().length}</span>
          {props.newRequestAction}
        </div>
      </div>

      <Show when={props.model.loadFailed()}>
        <PFormMessage tone="error">
          <span class="flex flex-wrap items-center justify-between gap-3">
            <span>{m.feature_request_list_failed()}</span>
            <PButton
              bordered
              onPress={() => props.model.refresh().catch(() => undefined)}
              size="small"
              tone="danger"
              transparent
            >
              {m.feature_request_retry()}
            </PButton>
          </span>
        </PFormMessage>
      </Show>

      <Show when={!props.model.loadFailed() || props.model.requests().length > 0}>
        <Show
          fallback={
            <Show
              fallback={
                <div
                  class={
                    'grid place-items-center rounded-5 border border-dashed border-border ' +
                    'px-4 py-10 text-center'
                  }
                >
                  <span
                    aria-hidden="true"
                    class="i-tabler-message-plus size-8 text-muted-foreground"
                  />
                  <p class="mb-0 mt-3 text-sm text-muted-foreground">{m.feature_request_empty()}</p>
                </div>
              }
              when={props.model.requests().length > 0}
            >
              <div class="grid gap-3">
                <For each={props.model.requests()}>
                  {(request) => (
                    <FeatureRequestCard
                      isAuthenticated={isAuthenticated()}
                      isVoting={props.model.votingRequestId() === request.id}
                      onVote={(requestId) => handleVote(requestId).catch(() => undefined)}
                      request={request}
                    />
                  )}
                </For>
              </div>
            </Show>
          }
          when={props.model.isLoading()}
        >
          <p class="m-0 py-8 text-center text-sm text-muted-foreground" role="status">
            {m.feature_request_list_loading()}
          </p>
        </Show>
      </Show>

      <Show when={voteMessage()}>
        {(message) => (
          <PFormMessage tone="error">
            {message() === 'closed'
              ? m.feature_request_vote_closed()
              : message() === 'unauthorized'
                ? m.feature_request_sign_in_required()
                : m.feature_request_vote_failed()}
          </PFormMessage>
        )}
      </Show>
    </section>
  )
}

const createVoteMessage = () => {
  const [message, setMessage] = createSignal<'closed' | 'failed' | 'unauthorized' | null>(null)
  return [message, setMessage] as const
}
