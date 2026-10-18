import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
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
  const t = useTranslations()
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
        <STooltip content={t('새 파일')}>
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('새 파일')}
              class="ui-icon-button"
              disabled={!props.session}
              onClick={() => creation.open('file')}
              type="button"
            >
              <SIcon name="newFile" />
            </button>
          )}
        </STooltip>
        <STooltip content={t('새 폴더')}>
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('새 폴더')}
              class="ui-icon-button"
              disabled={!props.session}
              onClick={() => creation.open('directory')}
              type="button"
            >
              <SIcon name="newFolder" />
            </button>
          )}
        </STooltip>
        <STooltip content={t('파일 트리 새로고침')}>
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('파일 트리 새로고침')}
              class="ui-icon-button"
              disabled={!props.session || props.refreshing || props.onRefresh === undefined}
              onClick={() => props.onRefresh?.()}
              type="button"
            >
              <SIcon name="refresh" />
            </button>
          )}
        </STooltip>
        <STooltip content={t('현재 파일 위치로 이동')} class="ml-auto">
          {(description) => (
            <button
              aria-describedby={description}
              aria-label={t('현재 파일 위치로 이동')}
              class="ui-icon-button"
              disabled={!props.canReveal}
              onClick={() => props.onReveal()}
              type="button"
            >
              <SIcon name="target" />
            </button>
          )}
        </STooltip>
      </div>
      <SFileCreationDialog creation={creation} />
    </>
  )
}
