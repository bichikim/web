import {createMemo, createSignal, For} from 'solid-js'
import type {TrackingRange} from '@winter-love/wallpaper/settings/tracking-range'
import {SRangeHandle} from './SRangeHandle'

interface SRangePadProps {
  readonly label: string
  readonly value: TrackingRange
  readonly limit: number
  readonly step?: number
  readonly compactHandles?: boolean
  readonly onPreview?: (range: TrackingRange | null) => void
  readonly onChange?: (range: TrackingRange) => void | Promise<void>
}
const CORNERS = [
  {horizontal: 'minX', label: '왼쪽 위', vertical: 'minY'},
  {horizontal: 'maxX', label: '오른쪽 위', vertical: 'minY'},
  {horizontal: 'minX', label: '왼쪽 아래', vertical: 'maxY'},
  {horizontal: 'maxX', label: '오른쪽 아래', vertical: 'maxY'},
] as const
const flip = (range: TrackingRange): TrackingRange => ({
  maxX: range.maxX,
  maxY: -range.minY,
  minX: range.minX,
  minY: -range.maxY,
})
export const SRangePad = (props: SRangePadProps) => {
  const [area, setArea] = createSignal<HTMLDivElement | null>(null)
  const [draft, setDraft] = createSignal<TrackingRange | null>(null)
  const range = createMemo(() => draft() ?? flip(props.value))
  const handlePreview = (value: TrackingRange | null) => {
    setDraft(value)
    props.onPreview?.(value === null ? null : flip(value))
  }
  const handleChange = (value: TrackingRange) => props.onChange?.(flip(value))
  return (
    <div class="rounded-lg border border-solid border-stone-300 bg-stone-100/60 p-3">
      <div role="group" aria-label={props.label} ref={setArea} class="relative h-32 touch-none">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-stone-500"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-stone-500"
        />
        <span
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-0 ml-2 text-[10px] text-stone-600"
        >
          위
        </span>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute right-0 top-1/2 mt-2 text-[10px] text-stone-600"
        >
          오른쪽
        </span>
        <SRangeHandle
          label={`${props.label} 이동`}
          value={range()}
          limit={props.limit}
          step={props.step}
          rectangle={() => area()?.getBoundingClientRect()}
          onPreview={handlePreview}
          onChange={props.onChange === undefined ? undefined : handleChange}
        />
        <For each={CORNERS}>
          {(corner) => (
            <SRangeHandle
              label={`${props.label} ${corner.label}`}
              horizontal={corner.horizontal}
              vertical={corner.vertical}
              value={range()}
              limit={props.limit}
              step={props.step}
              compact={props.compactHandles}
              rectangle={() => area()?.getBoundingClientRect()}
              onPreview={handlePreview}
              onChange={props.onChange === undefined ? undefined : handleChange}
            />
          )}
        </For>
      </div>
    </div>
  )
}
