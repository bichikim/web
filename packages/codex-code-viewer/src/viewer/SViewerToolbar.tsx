import {STooltip} from './STooltip'
import {useTranslations} from './locale/use-translations'
import type {NavigationOptions} from './types'
import type {CodeLocation} from '../shared/contracts'
import {SFileNavigation} from './SFileNavigation'
import {SFilePicker} from './SFilePicker'
import {SIcon} from './SIcon'
import type {useViewer} from './use-viewer'
import {Show} from 'solid-js'

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
  memosAvailable?: boolean
  memosVisible?: boolean
  onToggleMemos?: () => void
}

export const SViewerToolbar = (props: SViewerToolbarProps) => {
  const t = useTranslations()
  return (
    <SFilePicker
      actions={
        <>
          <Show when={props.memosAvailable}>
            <STooltip content={t('메모 표시/숨기기')}>
              {(description) => (
                <button
                  type="button"
                  class="ui-tree-toggle"
                  aria-label={t('메모')}
                  aria-describedby={description}
                  aria-controls="viewer-memos"
                  aria-expanded={props.memosVisible ?? false}
                  onClick={() => props.onToggleMemos?.()}
                >
                  <SIcon name="memo" />
                </button>
              )}
            </STooltip>
          </Show>
          <STooltip content={t('파일 트리 열기/닫기')}>
            {(description) => (
              <button
                aria-describedby={description}
                aria-label={t('파일 트리')}
                aria-controls={props.treeVisible ? 'workspace-files' : undefined}
                aria-expanded={props.treeVisible ?? false}
                class="ui-tree-toggle"
                disabled={props.viewer.workspaceSession() === null}
                onClick={() => props.onToggleTree?.()}
                type="button"
              >
                <SIcon name="folder" />
              </button>
            )}
          </STooltip>
          <STooltip content={t('설정')}>
            {(description) => (
              <button
                aria-describedby={description}
                type="button"
                aria-label={t('설정')}
                class="ui-tree-toggle"
                onClick={() => props.onSettings?.()}
                aria-haspopup="dialog"
              >
                <span aria-hidden="true" class="i-tabler-settings" />
              </button>
            )}
          </STooltip>
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
}
