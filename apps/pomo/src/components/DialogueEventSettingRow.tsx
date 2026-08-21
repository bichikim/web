import {type JSX, Show} from 'solid-js'

export interface DialogueEventSettingRowProps {
  readonly children?: JSX.Element
  readonly description?: string
  readonly label?: string
}

export const DialogueEventSettingRow = (props: DialogueEventSettingRowProps) => (
  <div
    class={
      'pomo-dialogue-settings__event-setting-row grid ' +
      'grid-cols-[minmax(12rem,_2fr)_minmax(16rem,_5fr)] items-center gap-4 ' +
      'border-t border-solid border-border pt-3 ' +
      'settings-compact:grid-cols-[1fr] settings-compact:gap-2'
    }
  >
    <div class="min-w-0">
      <span class="block text-muted-foreground text-[0.6875rem] font-bold">{props.label}</span>
      <Show when={props.description}>
        {(description) => (
          <p class="m-[0.2rem_0_0] text-muted-foreground text-[0.625rem] leading-[1.5]">
            {description()}
          </p>
        )}
      </Show>
    </div>
    <div class="min-w-0 w-full">{props.children}</div>
  </div>
)
