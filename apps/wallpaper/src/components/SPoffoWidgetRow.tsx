import {createUniqueId, type JSX} from 'solid-js'
import {DEFAULT_POFFO_SPEECH, type PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import {SChevron} from './SChevron'

interface SPoffoWidgetRowProps {
  readonly widget: PoffoWidget
  readonly number: number
  readonly name: string
  readonly selected: boolean
  readonly expanded?: boolean
  readonly children?: JSX.Element
  readonly onSelect?: () => void
  readonly onClose: () => void | Promise<void>
}
const TRACKING = {camera: '카메라', cursor: '커서', off: '트래킹 없음'}
export const SPoffoWidgetRow = (props: SPoffoWidgetRowProps) => {
  const id = createUniqueId()
  const expanded = () => props.expanded ?? props.selected
  const speech = () => props.widget.speech ?? DEFAULT_POFFO_SPEECH
  const handleSelect = (event: MouseEvent & {currentTarget: HTMLButtonElement}) => {
    event.currentTarget.focus()
    props.onSelect?.()
  }
  return (
    <li
      data-expanded={expanded()}
      class="overflow-hidden rounded-xl border border-solid border-stone-200 bg-white text-[13px]
      data-[expanded=true]:border-blue-200 data-[expanded=true]:shadow-sm
      transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none"
    >
      <div class="flex items-stretch">
        <button
          type="button"
          aria-label={`위젯 ${props.number} 설정`}
          aria-expanded={expanded()}
          aria-controls={id}
          data-selected={props.selected}
          onClick={handleSelect}
          class="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 appearance-none border-0
        bg-transparent p-3 text-left [font-family:inherit] hover:bg-stone-50
        data-[selected=true]:bg-blue-50/70 data-[selected=true]:hover:bg-blue-50
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px]
        focus-visible:outline-blue-700"
        >
          <span
            aria-hidden="true"
            data-selected={props.selected}
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100
          text-xs font-semibold text-stone-500 tabular-nums
          data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-700"
          >
            {String(props.number).padStart(2, '0')}
          </span>
          <span class="grid min-w-0 flex-1 gap-0.5">
            <span class="flex min-w-0 items-baseline gap-2">
              <span class="shrink-0 font-medium text-stone-800">위젯 {props.number}</span>
              <span class="truncate text-xs text-stone-600" title={props.name}>
                {props.name}
              </span>
            </span>
            <span class="truncate text-[11px] text-stone-600">
              {TRACKING[props.widget.tracking ?? 'off']} ·{' '}
              {speech().enabled ? '말풍선 켜짐' : '말풍선 꺼짐'}
              {speech().voice?.enabled ? ' · 읽어주기' : ''}
            </span>
          </span>
          <span
            aria-hidden="true"
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100
          text-stone-500 transition-transform duration-200 motion-reduce:transition-none"
            classList={{'rotate-180': expanded()}}
          >
            <SChevron />
          </span>
        </button>
        <button
          type="button"
          class="mr-2 grid h-8 w-8 shrink-0 cursor-pointer place-items-center self-center rounded-md
          border-0 bg-transparent p-0 text-stone-500 hover:bg-stone-100 hover:text-stone-800
          focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
          aria-label={`위젯 ${props.number} 닫기`}
          title="위젯 닫기"
          onClick={() => props.onClose()}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="h-4 w-4 fill-none stroke-current [stroke-width:1.8]"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div
        id={id}
        role="region"
        aria-label={`위젯 ${props.number} 설정 내용`}
        aria-hidden={!expanded()}
        inert={!expanded()}
        data-expanded={expanded()}
        class="grid [grid-template-rows:0fr] data-[expanded=true]:[grid-template-rows:1fr]
          transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(.22,.8,.25,1)]
          motion-reduce:transition-none"
      >
        <div class="min-h-0 overflow-hidden">
          <div class="grid gap-3 border-0 border-t border-solid border-stone-200 px-3 pb-3 pt-3">
            {props.children}
          </div>
        </div>
      </div>
    </li>
  )
}
