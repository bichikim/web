import {createSignal, ErrorBoundary, lazy, Show, Suspense} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {fileTransfer} from 'src/features/file-transfer/session'
import {PSideTabs} from '../p-side-tabs/PSideTabs'
import {PLoadingStatus} from '../p-loading-status/PLoadingStatus'
const TOOLS = [
  {
    component: lazy(() => import('./Units').then((module) => ({default: module.Units}))),
    icon: 'i-tabler-ruler',
    id: 'units',
    korean: false,
    title: m.tools_units,
  },
  {
    component: lazy(() => import('./Text').then((module) => ({default: module.Text}))),
    icon: 'i-tabler-text-size',
    id: 'text',
    korean: false,
    title: m.tools_text,
  },
  {
    component: lazy(() => import('./Service').then((module) => ({default: module.Service}))),
    icon: 'i-tabler-calendar-check',
    id: 'service',
    korean: true,
    title: m.tools_service,
  },
  {
    component: lazy(() => import('./Lunar').then((module) => ({default: module.Lunar}))),
    icon: 'i-tabler-moon',
    id: 'lunar',
    korean: true,
    title: m.tools_lunar,
  },
  {
    component: lazy(() => import('./Moving').then((module) => ({default: module.Moving}))),
    icon: 'i-tabler-calendar-heart',
    id: 'moving',
    korean: true,
    title: m.tools_moving,
  },
  {
    component: lazy(() => import('./Transfer').then((module) => ({default: module.Transfer}))),
    icon: 'i-tabler-transfer',
    id: 'transfer',
    korean: false,
    title: m.tools_transfer,
  },
] as const
export interface ContentProps {
  readonly selected?: string
  readonly onSelectedChange?: (selected: string) => void
}

export const Content = (props: ContentProps) => {
  const [localSelected, setLocalSelected] = createSignal('units')
  const selected = () => props.selected ?? localSelected()
  const handleSelectedChange = (value: string) => {
    setLocalSelected(value)
    props.onSelectedChange?.(value)
  }
  const available = () =>
    TOOLS.filter(
      (tool) =>
        (!tool.korean || getLocale() === 'ko') &&
        (tool.id !== 'transfer' || fileTransfer.isConfigured),
    )
  const active = () => available().find((tool) => tool.id === selected()) ?? TOOLS[0]
  return (
    <PSideTabs
      accessibleLabel={m.tools_choose()}
      items={available().map((tool) => ({icon: tool.icon, label: tool.title(), value: tool.id}))}
      value={active().id}
      onChange={handleSelectedChange}
    >
      <section class="min-w-0">
        <Show when={active().id !== 'transfer'}>
          <h2 class="mb-4 mt-0 text-lg font-750 text-foreground">{active().title()}</h2>
        </Show>
        <Show when={active()} keyed>
          {(tool) => (
            <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
              <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
                <Dynamic component={tool.component} />
              </Suspense>
            </ErrorBoundary>
          )}
        </Show>
      </section>
    </PSideTabs>
  )
}
