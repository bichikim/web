import {untrack} from 'solid-js'
import type {ViewerConnection, WorkspaceEntry} from '../shared/contracts'
import type {ViewerPort} from './types'
import {SIcon} from './SIcon'
import {SFileCreationDialog} from './SFileCreationDialog'
import {useFileCreation} from './use-file-creation'

interface SFileTreeToolbarProps {
  readonly canReveal: boolean
  readonly onCreated: (entry: WorkspaceEntry) => Promise<void>
  readonly onRefresh?: () => void
  readonly refreshing?: boolean
  readonly onReveal: () => void
  readonly parent: string
  readonly port: ViewerPort
  readonly session?: ViewerConnection
  readonly visible: boolean
}
export const SFileTreeToolbar = (props: SFileTreeToolbarProps) => {
  const creation = useFileCreation({
    onCreated: (entry) => props.onCreated(entry),
    parent: () => props.parent,
    port: untrack(() => props.port),
    session: () => props.session ?? null,
    visible: () => props.visible,
  })
  return (
    <>
      <div class="mx-2 mb-1 flex items-center gap-1">
        <button
          aria-label="새 파일"
          class="ui-icon-button"
          disabled={!props.session}
          onClick={() => creation.open('file')}
          title="새 파일"
          type="button"
        >
          <SIcon name="newFile" />
        </button>
        <button
          aria-label="새 폴더"
          class="ui-icon-button"
          disabled={!props.session}
          onClick={() => creation.open('directory')}
          title="새 폴더"
          type="button"
        >
          <SIcon name="newFolder" />
        </button>
        <button
          aria-label="파일 트리 새로고침"
          class="ui-icon-button"
          disabled={!props.session || props.refreshing || props.onRefresh === undefined}
          onClick={() => props.onRefresh?.()}
          title="파일 트리 새로고침"
          type="button"
        >
          <SIcon name="refresh" />
        </button>
        <button
          aria-label="현재 파일 위치로 이동"
          class="ui-icon-button ml-auto"
          disabled={!props.canReveal}
          onClick={() => props.onReveal()}
          title="현재 파일 위치로 이동"
          type="button"
        >
          <SIcon name="target" />
        </button>
      </div>
      <SFileCreationDialog creation={creation} />
    </>
  )
}
