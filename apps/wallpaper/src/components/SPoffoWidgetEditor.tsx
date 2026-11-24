import {text as uiText} from '../features/localization'
import {SPoffoWidgetNavigation} from './SPoffoWidgetNavigation'
import {SPoffoDialogueSettings} from './SPoffoDialogueSettings'
import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {
  type Accessor,
  createDeferred,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  Show,
  useContext,
} from 'solid-js'
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
import {SPoffoCalibrationPreview} from './SPoffoCalibrationPreview'
import {SPoffoSpeechSettings} from './SPoffoSpeechSettings'
import {SPoffoBehaviorSettings} from './SPoffoBehaviorSettings'
import {useParameters} from '../features/tracking/use-parameters'
import {HSettingsScope} from './HSettingsScope'
import {SettingsNavigationContext} from '../features/settings-navigation'
import {SPreviewWindow} from './SPreviewWindow'
import {SPoffoWidgetControls} from './SPoffoWidgetControls'
import {SSettingsContent} from './SSettingsContent'
import {trackingProfile} from '@winter-love/wallpaper/settings/tracking-profile'

const DEFAULT_SIZE = {height: 420, width: 320}
interface SPoffoWidgetEditorProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
  readonly widget?: PoffoWidget | null
  readonly assetId: Accessor<string | null>
  readonly active?: boolean
}

export const SPoffoWidgetEditor = (props: SPoffoWidgetEditorProps) => {
  const navigation = useContext(SettingsNavigationContext)
  const [motions, setMotions] = createSignal<readonly string[]>([])
  const [section, setSection] = createSignal('overview')
  const [previewOpen, setPreviewOpen] = createSignal(false)
  const previewId = createUniqueId()
  const contentSection = createDeferred(section)
  const pending = () => navigation?.pending() === true || section() !== contentSection()
  const editable = () => Boolean(props.widget)
  const visible = () => editable() && props.active !== false
  const entered = createMemo((previous) => previous || visible(), false)
  const previewAsset = () => (entered() ? props.assetId() : null)
  const settled = () => section() === contentSection() && props.active !== false
  const handleOverview = () => setSection('overview')
  const handlePreview = () => setPreviewOpen((value) => !value)
  const handlePreviewClose = () => setPreviewOpen(false)
  const preview = (scene: JSX.Element) => (
    <SPreviewWindow
      id={previewId}
      inline={contentSection() === 'overview'}
      active={visible()}
      open={previewOpen()}
      onClose={handlePreviewClose}
    >
      {scene}
    </SPreviewWindow>
  )
  const speech = createMemo(() => props.widget?.speech)
  const tracking = createMemo(() => trackingProfile(props.widget ?? undefined))
  const source = useParameters({
    assetId: () => props.assetId(),
    enabled: () => entered() && editable(),
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
  const configureTouch = (touch: PoffoTouch) =>
    configureSpeech({...DEFAULT_POFFO_SPEECH, ...speech(), touch})
  const handleInput = (mode: PoffoTracking) => {
    const widget = props.widget ?? null
    return widget === null ? undefined : props.library.trackWidget(widget.id, mode)
  }
  return (
    <SPoffoWidgetNavigation
      visible={visible()}
      onBack={handleOverview}
      value={section()}
      onChange={setSection}
      widget={props.widget ?? undefined}
      source={source}
      previewId={previewId}
      previewOpen={previewOpen()}
      onPreview={handlePreview}
    >
      <HSettingsScope active={settled()}>
        <SSettingsContent pending={pending()}>
          <div class="grid gap-3">
            <SPoffoCalibrationPreview
              preview={preview}
              label={uiText('Poffo 위젯 미리보기')}
              source={source}
              adjustments={contentSection() === 'gaze'}
              controls={
                <SPoffoWidgetControls
                  widget={props.widget}
                  section={contentSection()}
                  source={source}
                  motions={motions()}
                  onTracking={editable() ? handleInput : undefined}
                  onMotion={editable() ? configureMotion : undefined}
                  onTouch={editable() ? configureTouch : undefined}
                />
              }
              targetId={props.widget?.id}
              mode={props.widget?.tracking ?? 'off'}
              cameraSurface={geometry().surface}
              screenAspect={geometry().aspect}
              characterAspect={geometry().characterAspect}
              assetId={previewAsset}
              touch={() => speech()?.touch}
              load={props.controller.loadPuppet}
              lipsync={() => {
                const value = speech()
                return value?.lipsync?.source === 'microphone' || value?.enabled !== false
                  ? value?.lipsync
                  : undefined
              }}
              lipsyncId={() => props.widget?.id}
              agentBindings={() => speech()?.agentBindings}
              semanticBindings={() => speech()?.semanticBindings}
              motionId={() => props.widget?.motionId}
              onMotions={setMotions}
              bindings={() => tracking().bindings}
              value={tracking().options}
              onChange={editable() ? configureTracking : undefined}
              onBindingsChange={editable() ? configureBindings : undefined}
            />
            <Show when={editable() && contentSection() === 'speech'}>
              <SPoffoSpeechSettings value={speech()} onChange={configureSpeech} />
            </Show>
            <Show when={editable() && contentSection() === 'voice'}>
              <SPoffoDialogueSettings
                widgetId={props.widget?.id}
                source={source}
                assetId={props.assetId()}
                load={props.controller.loadPuppet}
                value={speech()}
                onChange={configureSpeech}
              />
            </Show>
            <Show when={editable() && contentSection() === 'behavior'}>
              <SPoffoBehaviorSettings
                source={source}
                widgetId={props.widget?.id}
                value={speech()}
                onChange={configureSpeech}
              />
            </Show>
          </div>
        </SSettingsContent>
      </HSettingsScope>
    </SPoffoWidgetNavigation>
  )
}
