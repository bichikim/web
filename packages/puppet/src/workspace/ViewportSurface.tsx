import {createEffect, createSignal, untrack} from 'solid-js'
import {CameraViewport} from '../editor/internal/CameraViewport'
import {PlayerCanvas, type PlayerCanvasStatus} from '../editor/PlayerCanvas'
import type {Player} from '../player'
import type {ViewportProps} from './types'
export const ViewportSurface = (props: ViewportProps) => {
  const [status, setStatus] = createSignal<PlayerCanvasStatus>('loading')
  createEffect(() => {
    const listener = props.onStatusChange
    const current = status()
    untrack(() => listener?.(current))
  })
  const [player, setPlayer] = createSignal<Player | null>(null)
  createEffect(() => {
    const listener = props.onPlayerChange
    const current = player()
    untrack(() => listener?.(current))
  })
  createEffect(() => {
    const current = player()
    const playing = props.playing
    if (playing !== undefined && current !== null) {
      if (playing) {
        current.resume()
      } else {
        current.pause()
      }
    }
  })
  return (
    <div
      class="workspace-viewport"
      style={{'--viewport-background': props.background ?? '#111715'}}
    >
      <CameraViewport
        width={props.document.viewport.width}
        height={props.document.viewport.height}
        fitRevision={props.fitRevision}
        view={props.view}
        onViewChange={props.onViewChange}
        controls={props.controls}
        viewControls={props.viewControls}
      >
        <PlayerCanvas
          document={props.document}
          motionId={props.motionId}
          expressionId={props.expressionId}
          resumeTime={props.resumeTime}
          parameterValues={props.parameterValues}
          physicsPreview={props.physicsPreview}
          spatialSurface={props.spatialSurface}
          onPlayerChange={setPlayer}
          onFrame={(frame) => props.onFrame?.(frame)}
          onStatusChange={setStatus}
        />
        {props.children}
      </CameraViewport>
    </div>
  )
}
