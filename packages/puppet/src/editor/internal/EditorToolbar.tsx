import {ToggleButton} from '@kobalte/core/toggle-button'

import type {PlayerCanvasStatus} from '../PlayerCanvas'
import type {EditorPanelVisibility} from './EditorPanelLayout'

const STATUS_LABEL: Readonly<Record<PlayerCanvasStatus, string>> = {
  error: '플레이어 오류',
  loading: '데이터 적용 중',
  ready: '배포 데이터 재생 중',
}

export interface EditorToolbarProps {
  readonly activeWorkspace?: 'animation' | 'modeling'
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

export const EditorToolbar = (props: EditorToolbarProps) => (
  <header class="toolbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        P
      </span>
      <div>
        <strong>Puppet</strong>
        <span>2D mesh editor</span>
      </div>
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
    <div class="toolbar-actions">
      <label class="toolbar-button primary">
        PNG 불러오기
        <input
          accept="image/png,.png"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            props.onPngImport(file)
          }}
        />
      </label>
      <label class="toolbar-button">
        JSON 가져오기
        <input
          accept="application/json,.json"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            props.onJsonImport(file)
          }}
        />
      </label>
      <button class="toolbar-button primary" type="button" onClick={() => props.onExport()}>
        JSON 내보내기
      </button>
      <div class="renderer-status" data-status={props.playerStatus}>
        <span class="status-dot" aria-hidden="true" />
        {STATUS_LABEL[props.playerStatus]}
      </div>
      <PanelVisibilityControls visibility={props.panelVisibility} />
    </div>
  </header>
)
