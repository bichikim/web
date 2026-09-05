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
  readonly onJsonImport: (file: File | undefined) => void
  readonly onPngImport: (file: File | undefined) => void
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
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="12" rx="1.5" width="14" x="1" y="2" />
        <path d="M5 2v12" />
      </svg>
    </ToggleButton>
    <ToggleButton
      aria-label={props.visibility?.rightOpen === false ? '오른쪽 패널 열기' : '오른쪽 패널 닫기'}
      pressed={props.visibility?.rightOpen !== false}
      onClick={() => props.visibility?.onRightToggle()}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="12" rx="1.5" width="14" x="1" y="2" />
        <path d="M11 2v12" />
      </svg>
    </ToggleButton>
    <ToggleButton
      aria-label={props.visibility?.bottomOpen === false ? '아래 프레임 열기' : '아래 프레임 닫기'}
      pressed={props.visibility?.bottomOpen !== false}
      onClick={() => props.visibility?.onBottomToggle()}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="12" rx="1.5" width="14" x="1" y="2" />
        <path d="M1 10h14" />
      </svg>
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
  readonly onJsonImport: (file: File | undefined) => void
  readonly onPngImport: (file: File | undefined) => void
}

const ToolbarMenu = (props: ToolbarMenuProps) => {
  const menuId = createUniqueId()
  const [menu, setMenu] = createSignal<HTMLDivElement>()
  const [pngInput, setPngInput] = createSignal<HTMLInputElement>()
  const [jsonInput, setJsonInput] = createSignal<HTMLInputElement>()

  return (
    <div class="toolbar-menu">
      <button
        aria-label="메인 메뉴"
        class="toolbar-menu-trigger"
        popovertarget={menuId}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div
        ref={setMenu}
        aria-label="파일 및 편집 작업"
        class="toolbar-menu-content"
        id={menuId}
        popover="auto"
      >
        <button
          type="button"
          onClick={() => {
            menu()?.hidePopover?.()
            pngInput()?.click()
          }}
        >
          PNG 불러오기
        </button>
        <button
          type="button"
          onClick={() => {
            menu()?.hidePopover?.()
            jsonInput()?.click()
          }}
        >
          JSON 가져오기
        </button>
        <hr />
        <button
          type="button"
          onClick={() => {
            menu()?.hidePopover?.()
            props.onExport()
          }}
        >
          JSON 내보내기
        </button>
        <hr />
        <button
          aria-description={`${props.historyUndoCount ?? 0}단계 되돌릴 수 있음 · ⌘Z / Ctrl+Z`}
          aria-label="실행 취소"
          disabled={props.canUndo !== true || props.onUndo === undefined}
          type="button"
          onClick={() => {
            menu()?.hidePopover?.()
            props.onUndo?.()
          }}
        >
          Undo
        </button>
        <button
          aria-description={`${props.historyRedoCount ?? 0}단계 다시 실행할 수 있음 · ⇧⌘Z / Ctrl+Y`}
          aria-label="다시 실행"
          disabled={props.canRedo !== true || props.onRedo === undefined}
          type="button"
          onClick={() => {
            menu()?.hidePopover?.()
            props.onRedo?.()
          }}
        >
          Redo
        </button>
        <hr />
        <EditorHelp onOpen={() => menu()?.hidePopover?.()} />
      </div>
      <input
        ref={setPngInput}
        accept="image/png,.png"
        aria-label="PNG 불러오기"
        hidden
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          props.onPngImport(file)
        }}
      />
      <input
        ref={setJsonInput}
        accept="application/json,.json"
        aria-label="JSON 가져오기"
        hidden
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          props.onJsonImport(file)
        }}
      />
    </div>
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
      onJsonImport={props.onJsonImport}
      onPngImport={props.onPngImport}
    />
    <div class="toolbar-actions">
      <div class="renderer-status" data-status={props.playerStatus}>
        <span class="status-dot" aria-hidden="true" />
        {STATUS_LABEL[props.playerStatus]}
      </div>

      <nav class="workspace-switcher" aria-label="편집 작업 공간">
        <button
          aria-pressed={props.activeWorkspace !== 'animation'}
          type="button"
          onClick={() => props.onWorkspaceChange?.('modeling')}
        >
          모델링
        </button>
        <button
          aria-pressed={props.activeWorkspace === 'animation'}
          type="button"
          onClick={() => props.onWorkspaceChange?.('animation')}
        >
          애니메이션
        </button>
      </nav>
      <PanelVisibilityControls visibility={props.panelVisibility} />
    </div>
  </header>
)
