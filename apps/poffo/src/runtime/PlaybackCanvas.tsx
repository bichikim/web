import {Viewport} from '@winter-love/puppet/editor'
import type {RuntimeView} from '../tracking/types'
import {
  type PlayerFrame,
  type PuppetDocument,
  type PuppetParameterValueMap,
} from '@winter-love/puppet/player'

interface PlaybackCanvasProps {
  readonly view?: RuntimeView
  readonly onViewChange?: (view: RuntimeView) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly document: PuppetDocument
  readonly resumeTime?: number
  readonly motionId?: string
  readonly expressionId?: string
  readonly playing: boolean
  readonly background?: string
  readonly onFrame: (frame: PlayerFrame) => void
  readonly onReady: (ready: boolean) => void
  readonly onError: (message: string) => void
}
export const PlaybackCanvas = (props: PlaybackCanvasProps) => (
  <div class="puppet-viewer-stage">
    <Viewport
      owner="runtime"
      document={props.document}
      motionId={props.motionId}
      expressionId={props.expressionId}
      resumeTime={props.resumeTime}
      parameterValues={props.parameterValues}
      playing={props.playing}
      view={props.view}
      onViewChange={props.onViewChange}
      onFrame={props.onFrame}
      background={props.background}
      onStatusChange={(status) => {
        props.onReady(status === 'ready')
        if (status === 'error') {
          props.onError('플레이어를 시작하지 못했습니다.')
        }
      }}
    />
  </div>
)
