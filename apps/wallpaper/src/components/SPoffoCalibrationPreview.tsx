import {createEffect, createMemo, createSignal, createUniqueId, type JSX, on, Show} from 'solid-js'
import type {PointBounds} from '../features/tracking/use-point-drag'
import type {
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import {type PoffoCalibrationOptions, SPoffoTrackingPreview} from './SPoffoTrackingPreview'
import {type CalibrationSection, SPoffoTrackingAdjustment} from './SPoffoTrackingAdjustment'
import {SPoffoTrackingBindings} from './SPoffoTrackingBindings'
import {type ParameterSource, useParameters} from '../features/tracking/use-parameters'

interface SPoffoCalibrationPreviewProps extends PoffoCalibrationOptions {
  readonly adjustments?: boolean
  /** Reuse the editor metadata across tracking, voice and behavior settings. */
  readonly source?: ParameterSource
  readonly controls?: JSX.Element
  /** Shared settings-file controls, supplied with the selected model's validation metadata. */
  readonly profiles?: (source: ParameterSource) => JSX.Element
  readonly connections?: (source: ParameterSource) => JSX.Element
  readonly label?: string
  readonly onBindingsChange?: (bindings: PoffoTrackingBindings) => void | Promise<void>
  readonly children?: JSX.Element
  readonly view?: PointBounds
}
export const SPoffoCalibrationPreview = (props: SPoffoCalibrationPreviewProps) => {
  const [draft, setDraft] = createSignal<PoffoTrackingOptions | null>(null)
  const options = createMemo(() => draft() ?? props.value)
  const [handles, setHandles] = createSignal(false)
  const [section, setSection] = createSignal<CalibrationSection>('position')
  const target = createMemo(() => props.targetId)
  const asset = createMemo(() => props.assetId())
  const preview = createUniqueId()
  const mode = () => props.mode ?? 'camera'
  const parameters = useParameters({
    assetId: () => props.assetId(),
    enabled: () =>
      props.source === undefined &&
      props.adjustments !== false &&
      (section() === 'bindings' || (props.profiles !== undefined && props.onChange !== undefined)),
    load: (id) => props.load(id),
  })
  const source = createMemo(() => props.source ?? parameters)
  const positioning = () =>
    props.adjustments !== false && handles() && section() === 'position' && mode() === 'camera'
  createEffect(
    on([target, asset], () => {
      setDraft(null)
      setHandles(false)
      setSection('position')
    }),
  )
  const handleToggle = () => {
    setDraft(null)
    setHandles((value) => !value)
  }
  const handleSection = (value: CalibrationSection) => {
    setDraft(null)
    setSection(value)
  }
  const action = (
    <button
      type="button"
      class="box-border grid h-8 w-8 shrink-0 cursor-pointer place-items-center appearance-none
        rounded-md border border-solid border-stone-300 bg-white/80 p-0 text-stone-700 shadow-sm
        hover:bg-white aria-pressed:bg-blue-50 aria-pressed:text-blue-700
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700
        focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50"
      aria-label={handles() ? '위치 핸들 숨기기' : '위치 핸들 표시'}
      title={handles() ? '위치 핸들 숨기기' : '위치 핸들 표시'}
      aria-pressed={handles()}
      aria-controls={preview}
      disabled={props.onChange === undefined}
      onClick={handleToggle}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="block h-4 w-4 fill-none stroke-current [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path
          d={
            handles()
              ? 'm5 12 4 4L19 6'
              : 'M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
          }
        />
      </svg>
    </button>
  )
  return (
    <div class="grid w-full gap-3">
      <figure
        id={preview}
        aria-label={props.label ?? 'Poffo 미리보기'}
        class="relative m-0 w-full overflow-hidden rounded-xl bg-stone-200"
        classList={{
          '[aspect-ratio:var(--preview-aspect)]':
            mode() !== 'camera' && props.screenAspect !== undefined,
          'h-52': mode() !== 'camera' && props.screenAspect === undefined,
        }}
        style={{'--preview-aspect': props.screenAspect}}
      >
        <SPoffoTrackingPreview
          {...props}
          mode={mode()}
          value={options()}
          actions={
            props.adjustments !== false &&
            props.onChange !== undefined &&
            mode() === 'camera' &&
            section() === 'position'
              ? action
              : undefined
          }
          calibrating={positioning()}
          view={props.view}
          children={props.children}
        />
      </figure>
      {props.controls}
      <Show when={props.adjustments !== false && props.onChange !== undefined}>
        <section aria-label="시선 보정 설정" class="grid gap-3">
          <h3 class="m-0 text-[13px] font-medium text-stone-700">시선 보정</h3>
          {props.profiles?.(source())}
          <SPoffoTrackingAdjustment
            mode={mode()}
            section={section()}
            onSectionChange={handleSection}
            value={options()}
            onPreview={setDraft}
            onChange={props.onChange}
          >
            <SPoffoTrackingBindings
              source={source()}
              disclosure={false}
              assetId={props.assetId()}
              load={props.load}
              value={props.bindings?.()}
              onChange={props.onBindingsChange}
            />
            {props.connections?.(source())}
          </SPoffoTrackingAdjustment>
        </section>
      </Show>
    </div>
  )
}
