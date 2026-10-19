import type {useGraphEditor} from './graph/use-graph-editor'
import {lazy, Show} from 'solid-js'
import type {PuppetDocument} from '../player'
import type {RuntimeControls} from './use-runtime-controls'
import {ParameterControls} from './ParameterControls'
import {TrackingPanel} from './TrackingPanel'
const MappingGraph = lazy(async () => ({
  default: (await import('./graph/MappingGraph')).MappingGraph,
}))
interface RuntimeToolsProps {
  readonly document: PuppetDocument
  readonly controls: RuntimeControls
  readonly studio: boolean
  readonly workspace?: ReturnType<typeof useGraphEditor>
  readonly onError: (message: string) => void
}
export const RuntimeTools = (props: RuntimeToolsProps) => (
  <aside
    class={props.studio ? 'puppet-studio-tools' : 'puppet-runtime-sidebar'}
    aria-label={props.studio ? 'Studio 운용 설정' : 'Viewer 개발 도구'}
  >
    <Show
      when={props.studio}
      fallback={
        <details class="puppet-runtime-section">
          <summary>카메라 추적 테스트</summary>
          <TrackingPanel
            document={props.document}
            controls={props.controls}
            debug
            onError={props.onError}
          />
        </details>
      }
    >
      <TrackingPanel
        document={props.document}
        controls={props.controls}
        debug={false}
        graph
        onError={props.onError}
      />
      <Show when={props.workspace}>
        {(workspace) => (
          <MappingGraph
            parameters={props.document.parameters ?? []}
            controls={props.controls}
            workspace={workspace()}
          />
        )}
      </Show>
    </Show>
    <Show when={!props.studio}>
      <ParameterControls document={props.document} controls={props.controls} debug />
    </Show>
  </aside>
)
