import {BaseHeader} from '../workspace/BaseHeader'
import {WorkspaceNavigation} from '../WorkspaceNavigation'
import {createMemo, type JSX, Show} from 'solid-js'
import {RuntimeMenu} from './RuntimeMenu'
import type {useWorkspaceLayout} from './graph/use-workspace-layout'
interface RuntimeHeaderProps {
  /** Current document session. Omitted, retain the URL session. */
  readonly sessionId?: string | null
  /** Selected motion. Omitted, retain the URL motion. */
  readonly motionId?: string
  readonly studio?: boolean
  readonly loading?: boolean
  readonly workspace?: ReturnType<typeof useWorkspaceLayout>
  readonly onLoadModel: (file: File | undefined) => void
  readonly children?: JSX.Element
}
export const RuntimeHeader = (props: RuntimeHeaderProps) => {
  const search = createMemo(() => {
    const query = new URLSearchParams(location.search)
    if (props.sessionId !== undefined && props.sessionId !== null) {
      query.set('session', props.sessionId)
    }
    if (props.motionId !== undefined) {
      query.set('motion', props.motionId)
    }
    return query.size === 0 ? '' : `?${query}`
  })
  return (
    <BaseHeader
      owner="runtime"
      menu={
        <RuntimeMenu
          onLoadModel={props.onLoadModel}
          workspace={props.studio ? props.workspace : undefined}
        />
      }
      navigation={
        <WorkspaceNavigation current={props.studio ? 'studio' : 'viewer'} search={search()} />
      }
    >
      <Show when={props.loading}>
        <span class="visually-hidden" role="status">
          문서 불러오는 중…
        </span>
      </Show>
      {props.children}
    </BaseHeader>
  )
}
