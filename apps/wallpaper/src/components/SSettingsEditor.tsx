import {text as uiText} from '../features/localization'
import {
  batch,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  onCleanup,
  Show,
  useContext,
} from 'solid-js'
import {SSettingsList} from './SSettingsList'
import {SSelect} from './SSelect'
import {HSettingsScope} from './HSettingsScope'
import {SettingsNavigationContext} from '../features/settings-navigation'

interface SSettingsEditorProps {
  readonly options: ComponentProps<typeof SSettingsList>['options']
  readonly label?: string
  readonly listLabel?: string
  readonly emptyMessage?: string
  readonly searchable?: boolean
  /** List-only controls can open an item after creating it. */
  readonly actions?: (edit: (id: string) => void | Promise<void>) => JSX.Element
  readonly footer?: JSX.Element
  /** Receives the active detail ID, or null when returning to the list. */
  readonly onSelect?: (id: string | null) => void
  readonly children: (id: string) => JSX.Element
}

const captureScroll = (root: HTMLElement) => {
  const ancestors: HTMLElement[] = []
  let parent = root.parentElement
  while (parent !== null) {
    ancestors.push(parent)
    parent = parent.parentElement
  }
  const descendants = [...root.querySelectorAll<HTMLElement>('*')].filter(
    (element) =>
      element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth,
  )
  const positions = [...descendants, ...ancestors].map((element) => ({
    element,
    left: element.scrollLeft,
    top: element.scrollTop,
  }))
  return () =>
    positions.forEach(({element, left, top}) => {
      if (element.isConnected) {
        element.scrollLeft = left
        element.scrollTop = top
      }
    })
}

/** Keeps the list mounted while its detail occupies the same editing area. */
export const SSettingsEditor = (props: SSettingsEditorProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const [list, setList] = createSignal<HTMLDivElement | null>(null)
  const [panel, setPanel] = createSignal<HTMLDivElement | null>(null)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [editing, setEditing] = createSignal(false)
  const label = () => props.label ?? uiText('설정 항목')
  const listLabel = () => props.listLabel ?? uiText('{value0} 목록', {value0: String(label())})
  const active = createMemo(() => props.options.find((option) => option.value === selected()))
  const detail = createMemo(() => (editing() ? active()?.value : undefined))
  let restore: (() => void) | null = null
  let origin: HTMLElement | null = null
  const edit = (id: string) => {
    if (!props.options.some((option) => option.value === id) || detail() === id) {
      return
    }
    const root = list()
    if (detail() === undefined && root !== null) {
      restore = captureScroll(root)
      const focused = root.ownerDocument.activeElement
      origin = focused instanceof HTMLElement && root.contains(focused) ? focused : null
    }
    const update = () => {
      batch(() => {
        setSelected(id)
        setEditing(true)
      })
      props.onSelect?.(id)
    }
    if (navigation === undefined) {
      return update()
    }
    return navigation.navigate([...navigation.path(), breadcrumb(id)], update)
  }
  const handleBack = () => setEditing(false)
  const breadcrumb = (id: string | undefined) => ({
    label: uiText('{value0} 선택', {value0: String(label())}),
    onBack: handleBack,
    onSelect: edit,
    options: props.options,
    value: id,
  })
  createEffect(() => {
    if (navigation?.active() === false) {
      setEditing(false)
    }
  })
  createEffect(
    on(
      detail,
      (id) => {
        if (id !== undefined) {
          const select = panel()?.querySelector<HTMLButtonElement>('[role="combobox"]')
          select?.focus({preventScroll: true})
          select?.scrollIntoView?.({behavior: 'instant', block: 'nearest'})
          return
        }
        setEditing(false)
        props.onSelect?.(null)
        if (navigation?.active() !== false) {
          restore?.()
          const target = origin?.isConnected
            ? origin
            : list()?.querySelector<HTMLElement>('input,button')
          target?.focus({preventScroll: true})
        }
      },
      {defer: true},
    ),
  )
  onCleanup(() => props.onSelect?.(null))
  return (
    <HSettingsScope active={detail() !== undefined} segment={breadcrumb(detail())}>
      <div class="grid min-w-0 gap-3">
        <div
          ref={setList}
          hidden={detail() !== undefined}
          class="min-w-0 gap-3"
          classList={{grid: detail() === undefined, hidden: detail() !== undefined}}
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <Show when={navigation === undefined}>
              <h3 class="m-0 text-[13px] font-medium text-stone-700">{label()}</h3>
            </Show>
            {props.actions?.(edit)}
          </div>
          <Show
            when={props.options.length > 0 || props.searchable === true}
            fallback={
              <p class="m-0 text-xs text-stone-600">
                {props.emptyMessage ?? uiText('추가한 항목이 없어요.')}
              </p>
            }
          >
            <SSettingsList
              label={listLabel()}
              options={props.options}
              searchable={props.searchable}
              emptyMessage={props.emptyMessage ?? uiText('추가한 항목이 없어요.')}
              value={selected() ?? undefined}
              onChange={edit}
            />
          </Show>
          {props.footer}
        </div>
        <Show when={detail()}>
          <div ref={setPanel} class="grid min-w-0 gap-3">
            <Show when={navigation === undefined}>
              <h3 class="m-0 text-[13px] font-medium text-stone-700">{label()}</h3>
              <div class="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={uiText('{value0} 목록으로', {value0: String(label())})}
                  title={uiText('{value0} 목록으로', {value0: String(label())})}
                  onClick={handleBack}
                  class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent
              text-stone-600 hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2
              focus-visible:outline-blue-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    class="h-5 w-5 fill-none stroke-current [stroke-width:1.8]
                  [stroke-linecap:round] [stroke-linejoin:round]"
                  >
                    <path d="m12 5-7 7 7 7M5 12h15" />
                  </svg>
                </button>
                <div class="min-w-0 flex-1">
                  <SSelect
                    label={uiText('{value0} 선택', {value0: String(label())})}
                    options={props.options}
                    value={detail()}
                    onChange={edit}
                  />
                </div>
              </div>
            </Show>
            <Show when={detail()} keyed>
              {(id) => props.children(id)}
            </Show>
          </div>
        </Show>
      </div>
    </HSettingsScope>
  )
}
