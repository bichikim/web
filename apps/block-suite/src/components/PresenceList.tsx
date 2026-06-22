import {For} from 'solid-js'
import type {BlocksUser} from '@winter-love/blocks'

export interface PresenceUser extends BlocksUser {
  readonly clientId: number
  readonly isLocal: boolean
}

export interface PresenceListProps {
  readonly users: readonly PresenceUser[]
}

export const PresenceList = (props: PresenceListProps) => (
  <div class="flex max-w-[min(48vw,32rem)] flex-wrap items-center justify-end gap-2">
    <For each={props.users}>
      {(user) => (
        <div
          class={[
            'h-8 max-w-40 flex items-center gap-2 rounded border border-neutral-200',
            'px-2 text-xs text-white shadow-sm',
          ].join(' ')}
          style={{'background-color': user.color, 'border-color': user.color}}
          title={`${user.name} (${String(user.clientId)})`}
        >
          <span class="h-3 w-3 shrink-0 rounded-full bg-white/90" />
          <span class="min-w-0 truncate font-600">{user.name}</span>
          {user.isLocal && (
            <span class="rounded bg-white/20 px-1 py-0.5 text-[10px] font-700 uppercase">Me</span>
          )}
        </div>
      )}
    </For>
  </div>
)
