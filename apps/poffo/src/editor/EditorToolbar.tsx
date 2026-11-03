import {BaseHeader} from '../workspace/BaseHeader'
import type {WorkspaceNavigationAction} from '../workspace/types'
import {WorkspaceNavigation} from '../WorkspaceNavigation'
import {
  type EditorPanelVisibility,
  EditorSegmentedField,
  type PlayerCanvasStatus,
  type PuppetExampleDocument,
} from '@winter-love/puppet/editor'
import {Show} from 'solid-js'
import {EditorToolbarMenu} from './toolbar/EditorToolbarMenu'
import {EditorBrushSettingsMount} from './toolbar/EditorBrushSettingsMount'
import {EditorPanelVisibilityControls} from './toolbar/EditorPanelVisibilityControls'

const STATUS_LABEL: Readonly<Record<PlayerCanvasStatus, string>> = {
  error: '플레이어 오류',
  loading: '데이터 적용 중',
  ready: '',
}

export interface EditorToolbarProps {
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  readonly setBrushSettingsMount?: (element: HTMLDivElement | undefined) => void
  readonly activeWorkspace?: 'animation' | 'modeling'
  readonly canRedo?: boolean
  readonly canUndo?: boolean
  readonly historyRedoCount?: number
  readonly historyUndoCount?: number
  readonly onRedo?: () => void
  readonly onUndo?: () => void
  readonly onWorkspaceChange?: (workspace: 'animation' | 'modeling') => void
  readonly panelVisibility?: EditorPanelVisibility
  readonly playerStatus: PlayerCanvasStatus
  readonly onStudioOpen?: WorkspaceNavigationAction
  readonly onViewerOpen?: WorkspaceNavigationAction
  readonly onExport: () => void
  readonly onPoffoExport?: () => void
  /** Exports with part images packed into shared texture atlas pages. */
  readonly onAtlasExport?: () => void
  readonly onRecoveryOpen?: (returnFocus: () => void) => void
  readonly onExampleOpen?: (example: PuppetExampleDocument) => void
  readonly onFileImport: (file: File | undefined) => void
  readonly onPsdReimport?: (file: File | undefined) => void
  readonly onFileOpen: (file: File | undefined) => void
}

export const EditorToolbar = (props: EditorToolbarProps) => (
  <BaseHeader
    owner="editor"
    navigation={
      <Show when={props.onStudioOpen !== undefined || props.onViewerOpen !== undefined}>
        <WorkspaceNavigation
          current="editor"
          onStudioOpen={props.onStudioOpen}
          onViewerOpen={props.onViewerOpen}
        />
      </Show>
    }
    menu={
      <EditorToolbarMenu
        examples={props.examples}
        canUndo={props.canUndo}
        canRedo={props.canRedo}
        historyUndoCount={props.historyUndoCount}
        historyRedoCount={props.historyRedoCount}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
        onExport={props.onExport}
        onPoffoExport={props.onPoffoExport}
        onAtlasExport={props.onAtlasExport}
        onRecoveryOpen={props.onRecoveryOpen}
        onExampleOpen={props.onExampleOpen}
        onFileImport={props.onFileImport}
        onPsdReimport={props.onPsdReimport}
        onFileOpen={props.onFileOpen}
      />
    }
    extension={
      <Show when={props.setBrushSettingsMount}>
        {(setMount) => <EditorBrushSettingsMount setMount={setMount()} />}
      </Show>
    }
  >
    <Show when={props.playerStatus !== 'ready'}>
      <span
        class="renderer-status"
        data-status={props.playerStatus}
        role="status"
        aria-label={STATUS_LABEL[props.playerStatus]}
        title={STATUS_LABEL[props.playerStatus]}
      >
        <span class="status-dot" aria-hidden="true" />
      </span>
    </Show>

    <EditorSegmentedField<'modeling' | 'animation'>
      label="편집 작업 공간"
      size="md"
      value={props.activeWorkspace ?? 'modeling'}
      options={[
        {label: '모델링', value: 'modeling'},
        {label: '애니메이션', value: 'animation'},
      ]}
      onChange={props.onWorkspaceChange}
    />
    <EditorPanelVisibilityControls visibility={props.panelVisibility} />
  </BaseHeader>
)
