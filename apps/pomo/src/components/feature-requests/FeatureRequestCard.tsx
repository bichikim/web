import {createUniqueId, Show} from 'solid-js'
import * as m from '@paraglide/message'

import {PButton} from '../p-button/PButton'
import type {FeatureRequest, FeatureRequestStatus} from '../../features/feature-requests'

interface FeatureRequestCardProps {
  readonly isAuthenticated: boolean
  readonly isVoting: boolean
  readonly onVote: (requestId: string) => void
  readonly request: FeatureRequest
}

const STATUS_CLASSES: Record<FeatureRequestStatus, string> = {
  completed: 'bg-secondary-soft text-muted-foreground',
  confirmed: 'bg-highlight/14 text-highlight',
  requested: 'bg-surface-interactive text-muted-foreground',
  voting: 'bg-primary-soft text-foreground',
}

const getStatusLabel = (status: FeatureRequestStatus): string => {
  switch (status) {
    case 'requested':
      return m.feature_request_status_requested()
    case 'voting':
      return m.feature_request_status_voting()
    case 'confirmed':
      return m.feature_request_status_confirmed()
    case 'completed':
      return m.feature_request_status_completed()
    default: {
      const exhaustiveStatus: never = status
      return exhaustiveStatus
    }
  }
}

export const FeatureRequestCard = (props: FeatureRequestCardProps) => {
  const titleId = createUniqueId()
  const targetVoteCount = () => props.request.targetVoteCount
  const goalReached = () => {
    const target = targetVoteCount()
    return target !== null && props.request.voteCount >= target
  }
  const canVote = () =>
    props.isAuthenticated &&
    !props.isVoting &&
    !props.request.votedByCurrentUser &&
    props.request.status !== 'confirmed' &&
    props.request.status !== 'completed'

  return (
    <article
      aria-labelledby={titleId}
      class="grid gap-4 rounded-5 border border-solid border-border bg-surface p-4"
    >
      <header class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class={`rounded-full px-2.5 py-1 text-xs font-750 ${STATUS_CLASSES[props.request.status]}`}
            >
              {getStatusLabel(props.request.status)}
            </span>
            <Show when={goalReached()}>
              <span class="rounded-full bg-highlight/14 px-2.5 py-1 text-xs font-750 text-highlight">
                {m.feature_request_goal_reached()}
              </span>
            </Show>
          </div>
          <h3 class="mb-0 mt-3 text-base font-750 leading-6 text-foreground" id={titleId}>
            {props.request.title}
          </h3>
        </div>
        <time
          class="flex-none text-xs leading-5 text-muted-foreground"
          dateTime={props.request.createdAt}
        >
          {new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(
            new Date(props.request.createdAt),
          )}
        </time>
      </header>

      <Show when={props.request.description}>
        <p class="m-0 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {props.request.description}
        </p>
      </Show>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-border pt-3">
        <Show when={targetVoteCount()}>
          {(target) => (
            <div class="min-w-36 flex-1">
              <div class="mb-1.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{m.feature_request_vote_progress()}</span>
                <span>
                  {m.feature_request_goal_progress({
                    count: props.request.voteCount,
                    target: target(),
                  })}
                </span>
              </div>
              <progress
                aria-label={m.feature_request_vote_progress()}
                class="h-2 w-full overflow-hidden rounded-full accent-highlight"
                max={target()}
                value={Math.min(props.request.voteCount, target())}
              />
            </div>
          )}
        </Show>
        <div class="flex items-center gap-3">
          <span class="text-sm font-700 text-foreground">
            {m.feature_request_vote_count({count: props.request.voteCount})}
          </span>
          <PButton
            bordered
            disabled={!canVote()}
            onPress={() => props.onVote(props.request.id)}
            pressed={props.request.votedByCurrentUser}
            size="small"
            tone="secondary"
            transparent
          >
            <span aria-hidden="true">+1</span>
            <span class="sr-only">
              {props.request.votedByCurrentUser
                ? m.feature_request_voted()
                : m.feature_request_vote()}
            </span>
          </PButton>
        </div>
      </div>
    </article>
  )
}
