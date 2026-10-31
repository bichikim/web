import {SPoffoConnectionProfiles} from './SPoffoConnectionProfiles'
import {SPoffoSemanticSettings} from './SPoffoSemanticSettings'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
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
import {speechPreviewView} from '../features/poffo/speech-preview-view'
import {SPoffoMotionSettings} from './SPoffoMotionSettings'
import {SPoffoLipSyncSettings} from './SPoffoLipSyncSettings'
import {SPoffoAgentStateSettings} from './SPoffoAgentStateSettings'
import type {AgentStateBindings} from '@winter-love/wallpaper/settings/agent-state'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {SPoffoCalibrationPreview} from './SPoffoCalibrationPreview'
import {SPoffoSpeechSettings} from './SPoffoSpeechSettings'
import {SPoffoSpeechPosition} from './SPoffoSpeechPosition'
import {SPoffoTrackingSettings} from './SPoffoTrackingSettings'
import {SSegmentedControl} from './SSegmentedControl'

const DEFAULT_SIZE = {height: 420, width: 320}
interface SPoffoWidgetEditorProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
  readonly widget?: PoffoWidget | null
  readonly assetId: Accessor<string | null>
}

export const SPoffoWidgetEditor = (props: SPoffoWidgetEditorProps) => {
  const [section, setSection] = createSignal<'poffo' | 'speech'>('poffo')
  const [motions, setMotions] = createSignal<readonly string[]>([])
  const editable = () => Boolean(props.widget)
  const speech = () => editable() && section() === 'speech'
  const geometry = createMemo(() => {
    const widget = props.widget ?? null
    const monitors = props.controller.monitors()
    return {
      aspect: widget === null ? undefined : widgetMonitorAspect(widget, monitors),
      characterAspect:
        (widget?.size?.width ?? DEFAULT_SIZE.width) / (widget?.size?.height ?? DEFAULT_SIZE.height),
      surface: widget === null ? undefined : widgetCameraSurface(widget, monitors),
      view: widget === null ? undefined : speechPreviewView(widget),
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
    configureSpeech({...DEFAULT_POFFO_SPEECH, ...props.widget?.speech, lipsync})
  const configureSemantics = (semanticBindings: readonly SemanticBinding[]) =>
    configureSpeech({...DEFAULT_POFFO_SPEECH, ...props.widget?.speech, semanticBindings})
  const configureAgent = (agentBindings: AgentStateBindings) =>
    configureSpeech({...DEFAULT_POFFO_SPEECH, ...props.widget?.speech, agentBindings})
  const handleInput = (mode: PoffoTracking) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.trackWidget(widget.id, mode)
  }
  return (
    <div class="grid gap-3">
      <Show when={editable()}>
        <SSegmentedControl
          label="위젯 편집 항목"
          options={[
            {label: 'Poffo', value: 'poffo'},
            {label: '말풍선', value: 'speech'},
          ]}
          value={section()}
          onChange={setSection}
        />
      </Show>
      <SPoffoCalibrationPreview
        label="Poffo 위젯 미리보기"
        adjustments={!speech()}
        connections={(source) => (
          <Show when={editable()}>
            <SPoffoConnectionProfiles
              actions={source.actions?.()}
              widget={props.widget ?? undefined}
              parameters={source.parameters()}
              loading={source.loading()}
            />
            <SPoffoLipSyncSettings
              source={source}
              assetId={props.assetId()}
              load={props.controller.loadPuppet}
              value={props.widget?.speech?.lipsync}
              onChange={configureLipSync}
            />
            <SPoffoSemanticSettings
              actions={source.actions?.()}
              widgetId={props.widget?.id}
              loading={source.loading()}
              value={props.widget?.speech?.semanticBindings}
              onChange={configureSemantics}
            />
            <SPoffoAgentStateSettings
              parameters={source.parameters()}
              loading={source.loading()}
              value={props.widget?.speech?.agentBindings}
              onChange={configureAgent}
            />
          </Show>
        )}
        controls={
          <Show when={!speech()}>
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
        view={geometry().view}
        assetId={props.assetId}
        load={props.controller.loadPuppet}
        lipsync={() =>
          props.widget?.speech?.enabled === false ? undefined : props.widget?.speech?.lipsync
        }
        lipsyncId={() => props.widget?.id}
        agentBindings={() => props.widget?.speech?.agentBindings}
        semanticBindings={() => props.widget?.speech?.semanticBindings}
        motionId={() => props.widget?.motionId}
        onMotions={setMotions}
        bindings={() => props.widget?.trackingBindings}
        value={props.widget?.trackingOptions}
        onChange={editable() ? configureTracking : undefined}
        onBindingsChange={editable() ? configureBindings : undefined}
      >
        <Show when={speech()}>
          <SPoffoSpeechPosition
            targetId={props.widget?.id}
            value={props.widget?.speech}
            onChange={configureSpeech}
          />
        </Show>
      </SPoffoCalibrationPreview>
      <Show when={speech()}>
        <SPoffoSpeechSettings value={props.widget?.speech} onChange={configureSpeech} />
      </Show>
    </div>
  )
}
