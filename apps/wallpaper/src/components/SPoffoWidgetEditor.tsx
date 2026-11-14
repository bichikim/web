import {SPoffoConnectionProfiles} from './SPoffoConnectionProfiles'
import {type Accessor, createMemo, createSignal, Show} from 'solid-js'
import {
  DEFAULT_POFFO_SPEECH,
  type PoffoSpeech,
  type PoffoWidget,
} from '@winter-love/wallpaper/settings/library-model'
import type {
  PoffoTracking,
  PoffoTrackingBindings,
  PoffoTrackingOptions,
} from '@winter-love/wallpaper/settings/tracking'
import type {WallpaperController} from '../features/settings'
import type {WallpaperLibraryController} from '../features/library'
import {widgetCameraSurface} from '../features/poffo/widget-camera-surface'
import {widgetMonitorAspect} from '../features/poffo/widget-monitor-aspect'
import {SPoffoMotionSettings} from './SPoffoMotionSettings'
import {SPoffoLipSyncSettings} from './SPoffoLipSyncSettings'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {SPoffoCalibrationPreview} from './SPoffoCalibrationPreview'
import {SPoffoTrackingSettings} from './SPoffoTrackingSettings'
import {SPoffoSpeechSettings} from './SPoffoSpeechSettings'
import {SPoffoBehaviorSettings} from './SPoffoBehaviorSettings'
import {SSegmentedControl} from './SSegmentedControl'
import {useParameters} from '../features/tracking/use-parameters'

const DEFAULT_SIZE = {height: 420, width: 320}
interface SPoffoWidgetEditorProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
  readonly widget?: PoffoWidget | null
  readonly assetId: Accessor<string | null>
}

export const SPoffoWidgetEditor = (props: SPoffoWidgetEditorProps) => {
  const [motions, setMotions] = createSignal<readonly string[]>([])
  const [section, setSection] = createSignal('character')
  const editable = () => Boolean(props.widget)
  const speech = createMemo(() => props.widget?.speech)
  const source = useParameters({
    assetId: () => props.assetId(),
    enabled: editable,
    load: (id) => props.controller.loadPuppet(id),
  })
  const geometry = createMemo(() => {
    const widget = props.widget ?? null
    const monitors = props.controller.monitors()
    return {
      aspect: widget === null ? undefined : widgetMonitorAspect(widget, monitors),
      characterAspect:
        (widget?.size?.width ?? DEFAULT_SIZE.width) / (widget?.size?.height ?? DEFAULT_SIZE.height),
      surface: widget === null ? undefined : widgetCameraSurface(widget, monitors),
    }
  })
  const configureTracking = (options: PoffoTrackingOptions) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.configureTracking(widget.id, options)
  }
  const configureBindings = (bindings: PoffoTrackingBindings) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.bindWidget(widget.id, bindings)
  }
  const configureSpeech = (speech: PoffoSpeech) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.configureSpeech(widget.id, speech)
  }
  const configureMotion = (motionId: string | null | undefined) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.setWidgetMotion(widget.id, motionId)
  }
  const configureLipSync = (lipsync: PoffoLipSync) =>
    configureSpeech({...DEFAULT_POFFO_SPEECH, ...speech(), lipsync})
  const handleInput = (mode: PoffoTracking) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.trackWidget(widget.id, mode)
  }
  return (
    <div class="grid gap-3">
      <Show when={editable()}>
        <SSegmentedControl
          label="위젯 편집 항목"
          appearance="underline"
          options={[
            {label: '캐릭터', value: 'character'},
            {label: '말풍선·음성', value: 'speech'},
            {label: '행동', value: 'behavior'},
          ]}
          value={section()}
          onChange={setSection}
        />
      </Show>
      <div hidden={editable() && section() === 'speech'}>
        <SPoffoCalibrationPreview
          label="Poffo 위젯 미리보기"
          source={source}
          adjustments={section() === 'character'}
          controls={
            <Show when={section() === 'character'}>
              <section aria-label="Poffo 설정" class="grid gap-3">
                <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-[13px]">
                  <span>트래킹 입력</span>
                  <SPoffoTrackingSettings
                    label="트래킹 입력"
                    value={props.widget?.tracking}
                    onChange={editable() ? handleInput : undefined}
                  />
                </div>
                <SPoffoMotionSettings
                  motions={motions()}
                  value={props.widget?.motionId}
                  onChange={editable() ? configureMotion : undefined}
                />
              </section>
            </Show>
          }
          targetId={props.widget?.id}
          mode={props.widget?.tracking ?? 'off'}
          cameraSurface={geometry().surface}
          screenAspect={geometry().aspect}
          characterAspect={geometry().characterAspect}
          assetId={props.assetId}
          load={props.controller.loadPuppet}
          lipsync={() => (speech()?.enabled === false ? undefined : speech()?.lipsync)}
          lipsyncId={() => props.widget?.id}
          agentBindings={() => speech()?.agentBindings}
          semanticBindings={() => speech()?.semanticBindings}
          motionId={() => props.widget?.motionId}
          onMotions={setMotions}
          bindings={() => props.widget?.trackingBindings}
          value={props.widget?.trackingOptions}
          onChange={editable() ? configureTracking : undefined}
          onBindingsChange={editable() ? configureBindings : undefined}
        />
      </div>
      <Show when={editable() && section() === 'speech'}>
        <SPoffoSpeechSettings value={speech()} onChange={configureSpeech} />
        <SPoffoLipSyncSettings
          source={source}
          assetId={props.assetId()}
          load={props.controller.loadPuppet}
          value={speech()?.lipsync}
          onChange={configureLipSync}
        />
      </Show>
      <Show when={editable() && section() === 'behavior'}>
        <SPoffoBehaviorSettings
          source={source}
          widgetId={props.widget?.id}
          value={speech()}
          onChange={configureSpeech}
        />
      </Show>
      <Show when={editable()}>
        <footer class="mt-2 border-0 border-t border-solid border-stone-200 pt-4">
          <SPoffoConnectionProfiles
            actions={source.actions?.()}
            widget={props.widget ?? undefined}
            parameters={source.parameters()}
            loading={source.loading()}
          />
        </footer>
      </Show>
    </div>
  )
}
