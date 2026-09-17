import {createSignal, For, Show, untrack} from 'solid-js'
import * as m from '@paraglide/message'

import {
  FEATURE_REQUEST_STATUSES,
  type FeatureRequest,
  type FeatureRequestStatus,
} from '../../features/feature-requests'
import type {AdminFeatureRequestStatusInput} from '../../features/feature-requests/use-admin-feature-requests'

interface AdminFeatureRequestCardProps {
  readonly disabled: boolean
  readonly onSave: (input: AdminFeatureRequestStatusInput) => Promise<string | null>
  readonly request: FeatureRequest
}

const getStatusLabel = (status: FeatureRequestStatus): string => {
  switch (status) {
    case 'completed':
      return m.feature_request_status_completed()
    case 'confirmed':
      return m.feature_request_status_confirmed()
    case 'requested':
      return m.feature_request_status_requested()
    case 'voting':
      return m.feature_request_status_voting()
    default: {
      const exhaustiveStatus: never = status
      return exhaustiveStatus
    }
  }
}

export const AdminFeatureRequestCard = (props: AdminFeatureRequestCardProps) => {
  const [status, setStatus] = createSignal<FeatureRequestStatus>(
    untrack(() => props.request.status),
  )
  const [targetVoteCount, setTargetVoteCount] = createSignal(
    untrack(() => props.request.targetVoteCount?.toString() ?? '10'),
  )
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const requiresTarget = () => status() === 'voting' || status() === 'confirmed'

  const handleSave = async (event: SubmitEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    const targetRequired = requiresTarget()
    const parsedTarget = targetRequired ? Number(targetVoteCount()) : null

    if (
      targetRequired &&
      (parsedTarget === null || !Number.isInteger(parsedTarget) || parsedTarget < 1)
    ) {
      setErrorMessage(m.admin_feature_request_target_invalid())
      return
    }

    const message = await props.onSave({
      requestId: props.request.id,
      status: status(),
      targetVoteCount: parsedTarget,
    })
    setErrorMessage(message)
  }

  return (
    <article class="grid gap-5 rounded-5 border border-white/10 bg-white/4 p-5">
      <header>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-750 tracking-[0.16em] text-#e8bc88 uppercase">
            {getStatusLabel(props.request.status)}
          </span>
          <span class="text-xs text-white/45">
            · {m.feature_request_vote_count({count: props.request.voteCount})}
          </span>
        </div>
        <h2 class="mb-0 mt-2 text-lg font-750">{props.request.title}</h2>
        <Show when={props.request.description}>
          <p class="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-white/60">
            {props.request.description}
          </p>
        </Show>
      </header>

      <form class="grid gap-4 border-t border-white/10 pt-4" onSubmit={handleSave}>
        <fieldset class="grid gap-2" disabled={props.disabled}>
          <legend class="text-sm font-700">{m.admin_feature_request_status_change()}</legend>
          <div class="flex flex-wrap gap-2">
            <For each={FEATURE_REQUEST_STATUSES}>
              {(option) => (
                <button
                  aria-pressed={status() === option}
                  class={
                    'rounded-2 border border-white/15 bg-white/5 px-3 py-2 text-xs font-700 ' +
                    'transition hover:bg-white/10 aria-pressed:border-#e8bc88 ' +
                    'aria-pressed:bg-#e8bc88/15 aria-pressed:text-#f3d1a9'
                  }
                  onClick={() => setStatus(option)}
                  type="button"
                >
                  {getStatusLabel(option)}
                </button>
              )}
            </For>
          </div>
        </fieldset>

        <Show when={requiresTarget()}>
          <label class="grid gap-2 text-sm font-700">
            {m.admin_feature_request_vote_goal()}
            <input
              class={
                'h-10 rounded-2 border border-white/15 bg-black/15 px-3 text-sm text-white ' +
                'outline-none focus:border-#e8bc88'
              }
              disabled={props.disabled}
              min="1"
              onInput={(event) => setTargetVoteCount(event.currentTarget.value)}
              type="number"
              value={targetVoteCount()}
            />
          </label>
        </Show>

        <div class="flex flex-wrap items-center gap-3">
          <button
            class={
              'h-10 rounded-2 border border-#e8bc88/50 bg-#e8bc88/15 px-4 text-sm font-700 ' +
              'text-#f3d1a9 transition hover:bg-#e8bc88/25 ' +
              'disabled:cursor-not-allowed disabled:opacity-50'
            }
            disabled={props.disabled}
            type="submit"
          >
            {props.disabled ? m.admin_feature_request_saving() : m.admin_feature_request_save()}
          </button>
          <Show when={errorMessage()}>
            {(message) => (
              <span class="text-sm text-#ff9e8f" role="alert">
                {message()}
              </span>
            )}
          </Show>
        </div>
      </form>
    </article>
  )
}
