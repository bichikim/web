import {TrackingMappings} from './TrackingMappings'
import {createEffect, createSignal, For, on, Show} from 'solid-js'
import {EditorButton} from '../design-system'
import type {PuppetDocument} from '../player'
import {useFaceTracking} from '../tracking/use-face-tracking'
import type {TrackingStatus} from '../tracking/types'
import type {RuntimeControls} from './use-runtime-controls'

interface TrackingPanelProps {
  readonly document: PuppetDocument
  readonly controls: RuntimeControls
  readonly debug: boolean
  readonly graph?: boolean
  readonly onError: (message: string) => void
}
const STATUS: Readonly<Record<TrackingStatus, string>> = {
  error: '추적 오류',
  missing: '얼굴을 찾는 중',
  starting: '카메라 준비 중',
  stopped: '카메라 꺼짐',
  tracking: '추적 중',
}
const DISPLAY_DIGITS = 3
export const TrackingPanel = (props: TrackingPanelProps) => {
  const [cameraVisible, setCameraVisible] = createSignal(false)
  const [video, setVideo] = createSignal<HTMLVideoElement>()
  const tracking = useFaceTracking({onFrame: (frame) => props.controls.handleFrame(frame), video})
  createEffect(on(() => props.document, tracking.stop, {defer: true}))
  const handleStart = async () => {
    await tracking.start()
    const error = tracking.error()
    if (error !== null) {
      props.onError(error)
    }
  }
  return (
    <section class="puppet-runtime-section" aria-label="얼굴 추적">
      <div class="puppet-runtime-actions">
        <strong>얼굴 추적</strong>
        <span role="status">{STATUS[tracking.status()]}</span>
      </div>
      <video
        class="puppet-runtime-camera"
        hidden={!cameraVisible()}
        ref={setVideo}
        muted
        playsinline
        aria-label="카메라 미리보기"
      />
      <div class="puppet-runtime-actions">
        <EditorButton
          aria-pressed={cameraVisible()}
          onClick={() => setCameraVisible((value) => !value)}
        >
          카메라 표시
        </EditorButton>
        <Show
          when={tracking.status() === 'stopped' || tracking.status() === 'error'}
          fallback={<EditorButton onClick={tracking.stop}>카메라 중지</EditorButton>}
        >
          <EditorButton onClick={handleStart}>카메라 시작</EditorButton>
        </Show>
      </div>
      <EditorButton disabled={props.controls.raw() === null} onClick={props.controls.calibrate}>
        현재 표정으로 전체 기준값 설정
      </EditorButton>
      <Show when={tracking.error()}>{(error) => <p role="alert">{error()}</p>}</Show>
      <Show when={props.debug}>
        <details>
          <summary>추적 원본 값</summary>
          <dl>
            <For each={Object.entries(tracking.values() ?? {})}>
              {([key, value]) => (
                <div>
                  <dt>{key}</dt>
                  <dd>{value?.toFixed(DISPLAY_DIGITS)}</dd>
                </div>
              )}
            </For>
          </dl>
        </details>
      </Show>
      <Show when={!props.graph}>
        <TrackingMappings document={props.document} controls={props.controls} debug={props.debug} />
      </Show>
    </section>
  )
}
