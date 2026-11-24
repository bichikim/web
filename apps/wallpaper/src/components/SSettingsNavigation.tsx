import {text as uiText} from '../features/localization'
import {createMemo, createSignal, type JSX, Suspense} from 'solid-js'
import {SettingsNavigationContext, useSettingsNavigation} from '../features/settings-navigation'
import {SSettingsPath} from './SSettingsPath'
import {SSettingsContent} from './SSettingsContent'

export type SettingsPage = 'background' | 'widget' | 'interaction' | 'general' | 'theme'
const PAGES = [
  {
    get label() {
      return uiText('테마')
    },
    value: 'theme',
  },
  {
    get label() {
      return uiText('배경')
    },
    value: 'background',
  },
  {
    get label() {
      return uiText('위젯')
    },
    value: 'widget',
  },
  {
    get label() {
      return uiText('조작')
    },
    value: 'interaction',
  },
  {
    get label() {
      return uiText('일반')
    },
    value: 'general',
  },
] as const
interface SSettingsNavigationProps {
  readonly value?: SettingsPage
  readonly onChange?: (page: SettingsPage) => void
  readonly children?: (page: SettingsPage) => JSX.Element
}
export const SSettingsNavigation = (props: SSettingsNavigationProps) => {
  const [local, setLocal] = createSignal<SettingsPage>('background')
  const [content, setContent] = createSignal<HTMLDivElement | null>(null)
  const selected = () => props.value ?? local()
  const select = (page: SettingsPage) => {
    setLocal(page)
    props.onChange?.(page)
  }
  const handleSelect = (value: string) => {
    const page = PAGES.find((page) => page.value === value)
    if (page !== undefined) {
      select(page.value)
    }
  }
  const resetContent = () => {
    const element = content()
    if (element !== null) {
      element.scrollTop = 0
      element.scrollLeft = 0
    }
  }
  const navigation = useSettingsNavigation(
    () => ({
      get label() {
        return uiText('설정 화면 선택')
      },
      onSelect: handleSelect,
      options: PAGES,
      value: selected(),
    }),
    resetContent,
  )
  const current = createMemo(
    () => PAGES.find((page) => page.value === (navigation.trail()[0]?.value ?? selected()))!,
  )
  return (
    <SettingsNavigationContext.Provider value={navigation}>
      <div class="flex h-dvh min-h-0 flex-col overflow-hidden">
        <header class="shrink-0 border-0 border-b border-solid border-stone-200 bg-stone-100">
          <div class="box-border mx-auto w-full max-w-140 px-4 py-3 sm:px-6">
            <SSettingsPath divider={false} />
          </div>
        </header>
        <section
          aria-label={uiText('{value0} 설정', {value0: String(current().label)})}
          class="flex min-h-0 min-w-0 flex-1 flex-col bg-white"
        >
          <SSettingsContent fill>
            <div
              ref={setContent}
              role="region"
              aria-label={uiText('{value0} 설정 내용', {value0: String(current().label)})}
              tabindex={0}
              aria-busy={navigation.pending()}
              inert={navigation.pending()}
              class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-solid
              focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700"
            >
              <div class="box-border mx-auto grid min-w-0 max-w-140 gap-5 px-4 py-5 sm:px-6">
                <Suspense fallback={<SSettingsContent pending />}>
                  {props.children?.(selected())}
                </Suspense>
              </div>
            </div>
          </SSettingsContent>
        </section>
      </div>
    </SettingsNavigationContext.Provider>
  )
}
