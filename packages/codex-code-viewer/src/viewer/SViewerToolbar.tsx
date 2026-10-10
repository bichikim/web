import type {NavigationOptions} from './types'
import type {CodeLocation} from '../shared/contracts'
import {SFileNavigation} from './SFileNavigation'
import {SFilePicker} from './SFilePicker'
import {SIcon} from './SIcon'
import type {useViewer} from './use-viewer'

interface SViewerToolbarProps {
  viewer: Pick<
    ReturnType<typeof useViewer>,
    | 'busy'
    | 'canBack'
    | 'canForward'
    | 'files'
    | 'find'
    | 'finding'
    | 'move'
    | 'opening'
    | 'refresh'
    | 'session'
    | 'workspaceSession'
  >
  onOpen: (location: CodeLocation, options?: NavigationOptions) => void
  onToggleTree?: () => void
  onSettings?: () => void
  focusRequest?: number
  treeVisible?: boolean
}

export const SViewerToolbar = (props: SViewerToolbarProps) => (
  <SFilePicker
    actions={
      <>
        <button
          aria-label="파일 트리"
          aria-controls={props.treeVisible ? 'workspace-files' : undefined}
          aria-expanded={props.treeVisible ?? false}
          class="ui-tree-toggle"
          disabled={props.viewer.workspaceSession() === null}
          onClick={() => props.onToggleTree?.()}
          title="파일 트리 열기/닫기"
          type="button"
        >
          <SIcon name="folder" />
        </button>
        <button
          type="button"
          aria-label="설정"
          title="설정"
          class="ui-tree-toggle"
          onClick={() => props.onSettings?.()}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true" class="i-tabler-settings" />
        </button>
      </>
    }
    busy={props.viewer.opening() || props.viewer.busy()}
    files={props.viewer.files()}
    finding={props.viewer.finding()}
    focusRequest={props.focusRequest}
    onFind={props.viewer.find}
    onOpen={props.onOpen}
    searchable={props.viewer.workspaceSession() !== null}
  >
    <SFileNavigation
      canBack={props.viewer.canBack()}
      canForward={props.viewer.canForward()}
      busy={props.viewer.busy()}
      hasDocument={props.viewer.session() !== null}
      onMove={props.viewer.move}
      onRefresh={props.viewer.refresh}
    />
  </SFilePicker>
)
