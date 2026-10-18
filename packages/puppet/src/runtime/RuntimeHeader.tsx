import {WorkspaceNavigation} from '../WorkspaceNavigation'
import {type JSX, Show} from 'solid-js'
import {RuntimeMenu} from './RuntimeMenu'
import type {useWorkspaceLayout} from './graph/use-workspace-layout'
interface RuntimeHeaderProps {
  readonly studio?: boolean
  readonly loading?: boolean
  readonly workspace?: ReturnType<typeof useWorkspaceLayout>
  readonly onLoadModel: (file: File | undefined) => void
  readonly children?: JSX.Element
}
export const RuntimeHeader = (props: RuntimeHeaderProps) => (
  <header class="puppet-viewer-toolbar">
    <RuntimeMenu onLoadModel={props.onLoadModel} workspace={props.workspace} />
    <strong>{props.studio ? 'Studio' : 'Viewer'}</strong>
    <Show when={props.loading}>
      <span class="visually-hidden" role="status">
        문서 불러오는 중…
      </span>
    </Show>
    {props.children}
    <WorkspaceNavigation current={props.studio ? 'studio' : 'viewer'} search={location.search} />
  </header>
)
