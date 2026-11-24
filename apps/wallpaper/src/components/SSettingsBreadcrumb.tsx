import {text as uiText} from '../features/localization'
import {createEffect, createSignal, on, Show, useContext} from 'solid-js'
import {type SettingsBreadcrumb, SettingsNavigationContext} from '../features/settings-navigation'
import {SSelect} from './SSelect'

interface SSettingsBreadcrumbProps {
  readonly segment: SettingsBreadcrumb
  readonly onBack?: () => void
}

export const SSettingsBreadcrumb = (props: SSettingsBreadcrumbProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const [element, setElement] = createSignal<HTMLSpanElement | null>(null)
  const label = () =>
    props.segment.options.find((option) => option.value === props.segment.value)?.label ??
    props.segment.label
  const handleBack = () => {
    const back = props.onBack
    if (navigation === undefined) {
      return back?.()
    }
    const trail = navigation.trail()
    const index = trail.findIndex((segment) => segment.label === props.segment.label)
    return navigation.navigate(trail.slice(0, index + 1), () => back?.())
  }
  const handleSelect = (value: string) => {
    if (navigation === undefined) {
      props.segment.onSelect?.(value)
    } else {
      return navigation.select(props.segment, value)
    }
  }
  createEffect(
    on(
      () => props.segment.value,
      () => {
        if (props.onBack === undefined && props.segment.onBack !== undefined) {
          element()
            ?.querySelector<HTMLButtonElement>('[role="combobox"]')
            ?.focus({preventScroll: true})
        }
      },
    ),
  )
  return (
    <span ref={setElement} class="inline-flex min-w-0 max-w-full items-center">
      <Show
        when={props.onBack !== undefined}
        fallback={
          <SSelect
            label={props.segment.label}
            options={props.segment.options}
            value={props.segment.value}
            onChange={handleSelect}
            appearance="breadcrumb"
          />
        }
      >
        <button
          type="button"
          aria-label={uiText('{value0} 목록으로', {value0: String(label())})}
          onClick={handleBack}
          class="min-h-8 min-w-0 cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 text-[13px] text-stone-600
            hover:bg-stone-200 hover:text-stone-900 focus-visible:outline-solid
            focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <span class="block truncate">{label()}</span>
        </button>
        <SSelect
          label={props.segment.label}
          options={props.segment.options}
          value={props.segment.value}
          onChange={handleSelect}
          appearance="breadcrumb-arrow"
        />
      </Show>
    </span>
  )
}
