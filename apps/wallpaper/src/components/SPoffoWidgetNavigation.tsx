import {text as uiText} from '../features/localization'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {ParameterSource} from '../features/tracking/use-parameters'
import {SPoffoProfileMenu} from './SPoffoProfileMenu'
import {type JSX, Show, useContext} from 'solid-js'
import {
  type SettingsBreadcrumb,
  SettingsNavigationContext,
  useSettingsNavigation,
  useSettingsScope,
} from '../features/settings-navigation'
import {SSettingsPath} from './SSettingsPath'
import {SSettingsLinks} from './SSettingsLinks'

interface SPoffoWidgetNavigationProps {
  readonly value?: string
  readonly widget?: PoffoWidget
  readonly source: ParameterSource
  readonly onChange?: (value: string) => void
  readonly visible?: boolean
  readonly children?: JSX.Element
  readonly onBack?: () => void
  readonly previewId?: string
  readonly previewOpen?: boolean
  readonly onPreview?: () => void
}
const SECTIONS = [
  {
    get label() {
      return uiText('기본')
    },
    value: 'basic',
  },
  {
    get label() {
      return uiText('시선')
    },
    value: 'gaze',
  },
  {
    get label() {
      return uiText('터치')
    },
    value: 'touch',
  },
  {
    get label() {
      return uiText('행동')
    },
    value: 'behavior',
  },
  {
    get label() {
      return uiText('말풍선')
    },
    value: 'speech',
  },
  {
    get label() {
      return uiText('대화·음성')
    },
    value: 'voice',
  },
] as const

export const SPoffoWidgetNavigation = (props: SPoffoWidgetNavigationProps) => {
  const parent = useContext(SettingsNavigationContext)
  const actions = () => (
    <div class="flex shrink-0 items-center gap-1">
      <Show when={props.onPreview !== undefined}>
        <button
          type="button"
          aria-label={props.previewOpen ? uiText('미리보기 창 닫기') : uiText('미리보기 창 열기')}
          title={props.previewOpen ? uiText('미리보기 창 닫기') : uiText('미리보기 창 열기')}
          aria-expanded={props.previewOpen ?? false}
          aria-controls={props.previewId}
          aria-haspopup="dialog"
          onClick={props.onPreview}
          class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent
            text-stone-600 hover:bg-stone-200 aria-expanded:bg-blue-100 aria-expanded:text-blue-700
            focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-5 w-5 fill-none stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </Show>
      <SPoffoProfileMenu
        actions={props.source.actions?.()}
        widget={props.widget}
        parameters={props.source.parameters()}
        loading={props.source.loading()}
      />
    </div>
  )
  const segment = (): SettingsBreadcrumb => ({
    actions,
    get label() {
      return uiText('위젯 편집 항목')
    },
    onBack: props.onBack,
    onSelect: props.onChange,
    options: SECTIONS,
    value: props.value ?? 'basic',
  })
  const scope = useSettingsScope({
    active: () => props.visible !== false && props.value !== 'overview',
    segment,
  })
  const navigation = parent === undefined ? useSettingsNavigation(segment) : scope!
  return (
    <SettingsNavigationContext.Provider value={navigation}>
      <div class="grid min-w-0 gap-3">
        <Show when={parent === undefined && props.visible !== false}>
          <SSettingsPath />
        </Show>
        {props.children}
        <Show when={props.value === 'overview'}>
          <SSettingsLinks
            label={uiText('위젯 편집 목록')}
            options={SECTIONS}
            onChange={props.onChange}
          />
        </Show>
      </div>
    </SettingsNavigationContext.Provider>
  )
}
