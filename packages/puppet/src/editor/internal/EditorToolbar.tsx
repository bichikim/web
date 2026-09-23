import {EditorSegmentedField, useEditorPortalMount} from '../../design-system'
import {FileAction} from './FileAction'
import {Popover} from '@kobalte/core/popover'
import {Button} from '@kobalte/core/button'
import {EditorHelp} from './EditorHelp'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {createSignal, createUniqueId} from 'solid-js'

import type {PlayerCanvasStatus} from '../PlayerCanvas'
import type {EditorPanelVisibility} from './EditorPanelLayout'

const STATUS_LABEL: Readonly<Record<PlayerCanvasStatus, string>> = {
  error: '플레이어 오류',
  loading: '데이터 적용 중',
  ready: '배포 데이터 재생 중',
}

export interface EditorToolbarProps {
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
  readonly onExport: () => void
  readonly onFileImport: (file: File | undefined) => void
  readonly onPsdReimport?: (file: File | undefined) => void
  readonly onFileOpen: (file: File | undefined) => void
}

interface PanelVisibilityControlsProps {
  readonly visibility?: EditorPanelVisibility
}

const PanelVisibilityControls = (props: PanelVisibilityControlsProps) => (
  <div class="panel-visibility-controls" aria-label="편집 패널 표시">
    <ToggleButton
      aria-label={props.visibility?.leftOpen === false ? '왼쪽 패널 열기' : '왼쪽 패널 닫기'}
      pressed={props.visibility?.leftOpen !== false}
      onClick={() => props.visibility?.onLeftToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar" />
    </ToggleButton>
    <ToggleButton
      aria-label={props.visibility?.rightOpen === false ? '오른쪽 패널 열기' : '오른쪽 패널 닫기'}
      pressed={props.visibility?.rightOpen !== false}
      onClick={() => props.visibility?.onRightToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar-right" />
    </ToggleButton>
    <ToggleButton
      aria-label={props.visibility?.bottomOpen === false ? '아래 프레임 열기' : '아래 프레임 닫기'}
      pressed={props.visibility?.bottomOpen !== false}
      onClick={() => props.visibility?.onBottomToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-bottombar" />
    </ToggleButton>
  </div>
)

interface ToolbarMenuProps {
  readonly canUndo?: boolean
  readonly canRedo?: boolean
  readonly historyUndoCount?: number
  readonly historyRedoCount?: number
  readonly onUndo?: () => void
  readonly onRedo?: () => void
  readonly onExport: () => void
  readonly onFileImport: (file: File | undefined) => void
  readonly onPsdReimport?: (file: File | undefined) => void
  readonly onFileOpen: (file: File | undefined) => void
}

const ToolbarMenu = (props: ToolbarMenuProps) => {
  const [menuOpen, setMenuOpen] = createSignal(false)
  const portalMount = useEditorPortalMount()

  return (
    <Popover forceMount open={menuOpen()} onOpenChange={setMenuOpen}>
      <Popover.Trigger aria-label="메인 메뉴" class="toolbar-menu-trigger" type="button">
        <span aria-hidden="true" class="puppet-icon puppet-icon-menu-2" />
      </Popover.Trigger>
      <Popover.Portal mount={portalMount}>
        <Popover.Content aria-label="파일 및 편집 작업" class="toolbar-menu-content">
          <FileAction
            label="가져오기"
            description="기존 문서에 추가 · PNG, PSD, JSON"
            onClose={() => setMenuOpen(false)}
            onImport={props.onFileImport}
          />
          <FileAction
            label="불러오기"
            description="현재 문서 교체 · 실행 취소 가능"
            onClose={() => setMenuOpen(false)}
            onImport={props.onFileOpen}
          />
          <FileAction
            label="PSD 재가져오기"
            description="기존 리깅 유지 · 변경 내용 확인"
            accept=".psd,image/vnd.adobe.photoshop"
            onClose={() => setMenuOpen(false)}
            onImport={props.onPsdReimport}
          />
          <hr />
          <Button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              props.onExport()
            }}
          >
            JSON 내보내기
          </Button>
          <hr />
          <Button
            aria-description={`${props.historyUndoCount ?? 0}단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z`}
            aria-label="실행 취소"
            disabled={props.canUndo !== true || props.onUndo === undefined}
            type="button"
            onClick={() => {
              setMenuOpen(false)
              props.onUndo?.()
            }}
          >
            Undo
          </Button>
          <Button
            aria-description={`${props.historyRedoCount ?? 0}단계 다시 실행할 수 있음 · ⇧⌘Z / Ctrl+Y`}
            aria-label="다시 실행"
            disabled={props.canRedo !== true || props.onRedo === undefined}
            type="button"
            onClick={() => {
              setMenuOpen(false)
              props.onRedo?.()
            }}
          >
            Redo
          </Button>
          <hr />
          <EditorHelp onOpen={() => setMenuOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}

export const EditorToolbar = (props: EditorToolbarProps) => (
  <header class="toolbar">
    <ToolbarMenu
      canUndo={props.canUndo}
      canRedo={props.canRedo}
      historyUndoCount={props.historyUndoCount}
      historyRedoCount={props.historyRedoCount}
      onUndo={props.onUndo}
      onRedo={props.onRedo}
      onExport={props.onExport}
      onFileImport={props.onFileImport}
      onPsdReimport={props.onPsdReimport}
      onFileOpen={props.onFileOpen}
    />
    <div class="toolbar-actions">
      <div class="renderer-status" data-status={props.playerStatus}>
        <span class="status-dot" aria-hidden="true" />
        {STATUS_LABEL[props.playerStatus]}
      </div>

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
      <PanelVisibilityControls visibility={props.panelVisibility} />
    </div>
  </header>
)
