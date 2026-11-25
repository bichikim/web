import {text as uiText} from '../features/localization'
import {createMemo, Index, Show, useContext} from 'solid-js'
import {SettingsNavigationContext} from '../features/settings-navigation'
import {SSettingsBreadcrumb} from './SSettingsBreadcrumb'

interface SSettingsPathProps {
  readonly divider?: boolean
}

export const SSettingsPath = (props: SSettingsPathProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const trail = () => navigation?.trail() ?? []
  const actions = createMemo(
    () => trail().findLast((segment) => segment.actions !== undefined)?.actions,
  )
  return (
    <div
      class="flex min-w-0 items-start gap-2 border-0"
      classList={{
        'border-b': props.divider !== false,
        'border-solid': props.divider !== false,
        'border-stone-200': props.divider !== false,
        'pb-3': props.divider !== false,
      }}
    >
      <nav
        aria-label={uiText('위젯 설정 경로')}
        class="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2"
      >
        <Index each={trail()}>
          {(segment, index) => (
            <span class="inline-flex min-w-0 max-w-full shrink-0 items-center gap-1">
              <Show when={index > 0}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  class="h-3.5 w-3.5 shrink-0 fill-none stroke-current text-stone-400 [stroke-width:1.5]"
                >
                  <path d="m7.5 5 5 5-5 5" />
                </svg>
              </Show>
              <SSettingsBreadcrumb segment={segment()} onBack={trail()[index + 1]?.onBack} />
            </span>
          )}
        </Index>
      </nav>
      <Show when={actions()} keyed>
        {(render) => render()}
      </Show>
    </div>
  )
}
