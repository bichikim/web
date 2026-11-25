import {createMemo, type JSX, Show, useContext} from 'solid-js'
import {SettingsNavigationContext} from '../features/settings-navigation'
import {text as uiText} from '../features/localization'

interface SSettingsContentProps {
  /** Additional deferred work; omission follows the surrounding settings navigation. */
  readonly pending?: boolean
  /** Fills the remaining page area; omission reserves an inline loading area. */
  readonly fill?: boolean
  /** Content remains mounted while hidden so drafts, scroll state and previews survive. */
  readonly children?: JSX.Element
}

export const SSettingsContent = (props: SSettingsContentProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const pending = createMemo(() => props.pending === true || navigation?.pending() === true)
  return (
    <div
      class="relative min-w-0"
      classList={{
        flex: props.fill === true,
        'flex-1': props.fill === true,
        'flex-col': props.fill === true,
        'min-h-0': props.fill === true,
        'min-h-24': props.fill !== true,
      }}
    >
      <div
        aria-busy={pending()}
        aria-hidden={pending()}
        inert={pending()}
        class="min-w-0"
        classList={{
          flex: props.fill === true,
          'flex-1': props.fill === true,
          'flex-col': props.fill === true,
          'min-h-0': props.fill === true,
          'opacity-0': pending(),
        }}
      >
        {props.children}
      </div>
      <Show when={pending()}>
        <div
          role="status"
          aria-label={uiText('페이지 전환 중')}
          class="pointer-events-none absolute left-0 right-0 top-0 box-border flex min-h-24
            items-center justify-center gap-2 p-6 text-[13px] leading-normal text-stone-600"
          classList={{'bottom-0': props.fill === true}}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-4 w-4 shrink-0 animate-spin fill-none stroke-current
              [stroke-width:2] [stroke-dasharray:32_20] motion-reduce:animate-none"
          >
            <circle cx="12" cy="12" r="8" />
          </svg>
          <span>{uiText('페이지 전환 중')}</span>
        </div>
      </Show>
    </div>
  )
}
