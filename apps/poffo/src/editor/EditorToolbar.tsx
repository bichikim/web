import {useWorkspace} from '../workspace/context'
import {BaseHeader} from '../workspace/BaseHeader'
import type {WorkspaceNavigationAction} from '../workspace/types'
import {WorkspaceNavigation} from '../WorkspaceNavigation'
import {
  type EditorPanelVisibility,
  EditorSegmentedField,
  EditorToggleButton,
  type PlayerCanvasStatus,
  type PuppetExampleDocument,
  useEditorPortalMount,
} from '@winter-love/puppet/editor'
import {FileAction} from './FileAction'
import {Popover} from '@kobalte/core/popover'
import {Button} from '@kobalte/core/button'
import {EditorHelp} from './EditorHelp'
import {createEffect, createSignal, createUniqueId, For, onCleanup, Show} from 'solid-js'

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

const BrushSettingsMount = (props: {
  readonly setMount: (element: HTMLDivElement | undefined) => void
}) => {
  onCleanup(() => props.setMount(undefined))
  return <div class="toolbar-brush-settings-mount" ref={props.setMount} />
}

interface PanelVisibilityControlsProps {
  readonly visibility?: EditorPanelVisibility
}

const PanelVisibilityControls = (props: PanelVisibilityControlsProps) => (
  <div class="panel-visibility-controls" aria-label="편집 패널 표시">
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.leftOpen === false ? '왼쪽 패널 열기' : '왼쪽 패널 닫기'}
      pressed={props.visibility?.leftOpen !== false}
      onClick={() => props.visibility?.onLeftToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar" />
    </EditorToggleButton>
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.rightOpen === false ? '오른쪽 패널 열기' : '오른쪽 패널 닫기'}
      pressed={props.visibility?.rightOpen !== false}
      onClick={() => props.visibility?.onRightToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar-right" />
    </EditorToggleButton>
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.bottomOpen === false ? '아래 프레임 열기' : '아래 프레임 닫기'}
      pressed={props.visibility?.bottomOpen !== false}
      onClick={() => props.visibility?.onBottomToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-bottombar" />
    </EditorToggleButton>
  </div>
)

interface ToolbarMenuProps {
  readonly onRecoveryOpen?: (returnFocus: () => void) => void
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  readonly canUndo?: boolean
  readonly canRedo?: boolean
  readonly historyUndoCount?: number
  readonly historyRedoCount?: number
  readonly onUndo?: () => void
  readonly onRedo?: () => void
  readonly onExport: () => void
  readonly onPoffoExport?: () => void
  /** Exports with part images packed into shared texture atlas pages. */
  readonly onAtlasExport?: () => void
  readonly onExampleOpen?: (example: PuppetExampleDocument) => void
  readonly onFileImport: (file: File | undefined) => void
  readonly onPsdReimport?: (file: File | undefined) => void
  readonly onFileOpen: (file: File | undefined) => void
}

/** A menu button that closes the menu and runs `onSelect`; hidden without it. */
const MenuAction = (props: {
  readonly label: string
  readonly onClose: () => void
  readonly onSelect?: () => void
}) => (
  <Show when={props.onSelect}>
    {(select) => (
      <Button
        type="button"
        onClick={() => {
          props.onClose()
          select()()
        }}
      >
        {props.label}
      </Button>
    )}
  </Show>
)

const ToolbarMenu = (props: ToolbarMenuProps) => {
  const macPlatform = /Mac|iPhone|iPad|iPod/u.test(globalThis.navigator?.platform ?? '')
  const undoShortcut = macPlatform ? '⌘Z' : 'Ctrl+Z'
  const redoShortcut = macPlatform ? '⇧⌘Z' : 'Ctrl+Y'
  const workspace = useWorkspace()
  const [menuOpen, setMenuOpen] = createSignal(false)
  createEffect(() => {
    if (workspace !== undefined && workspace.mode() !== 'editor') {
      setMenuOpen(false)
    }
  })
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>()
  const portalMount = useEditorPortalMount()
  const close = () => setMenuOpen(false)
  const handleReturnFocus = () => trigger()?.focus()
  const handleExampleOpen = (example: PuppetExampleDocument) => {
    setMenuOpen(false)
    props.onExampleOpen?.(example)
  }
  const handleRecoveryOpen = () => {
    const element = trigger()
    setMenuOpen(false)
    props.onRecoveryOpen?.(() => element?.focus())
  }

  return (
    <Popover forceMount open={menuOpen()} onOpenChange={setMenuOpen}>
      <Popover.Trigger
        ref={setTrigger}
        aria-label="메인 메뉴"
        class="toolbar-menu-trigger"
        type="button"
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-menu-2" />
      </Popover.Trigger>
      <Popover.Portal mount={portalMount}>
        <Popover.Content aria-label="파일 및 편집 작업" class="toolbar-menu-content">
          <FileAction
            label="가져오기"
            description="기존 문서에 추가 · PNG, PSD, JSON, Poffo"
            onClose={() => setMenuOpen(false)}
            onReturnFocus={handleReturnFocus}
            onImport={props.onFileImport}
          />
          <FileAction
            label="불러오기"
            description="현재 문서 교체 · 실행 취소 가능"
            onClose={() => setMenuOpen(false)}
            onReturnFocus={handleReturnFocus}
            onImport={props.onFileOpen}
          />
          <FileAction
            label="PSD 재가져오기"
            description="기존 리깅 유지 · 변경 내용 확인"
            accept=".psd,image/vnd.adobe.photoshop"
            onClose={() => setMenuOpen(false)}
            onReturnFocus={handleReturnFocus}
            onImport={props.onPsdReimport}
          />
          <Show when={props.examples?.length}>
            <details>
              <summary class="toolbar-menu-examples-trigger">예제</summary>
              <div aria-label="예제 문서" class="grid pl-editor-group" role="group">
                <For each={props.examples}>
                  {(example) => (
                    <Button type="button" onClick={() => handleExampleOpen(example)}>
                      {example.label}
                    </Button>
                  )}
                </For>
              </div>
            </details>
          </Show>
          <Show when={props.onRecoveryOpen}>
            <Button type="button" onClick={handleRecoveryOpen}>
              복구 찾기
            </Button>
          </Show>
          <hr />
          <MenuAction label="문서 저장" onClose={close} onSelect={props.onPoffoExport} />
          <MenuAction label="JSON 내보내기" onClose={close} onSelect={props.onExport} />
          <MenuAction
            label="텍스처 아틀라스로 JSON 내보내기"
            onClose={close}
            onSelect={props.onAtlasExport}
          />
          <hr />
          <Button
            aria-description={`${props.historyUndoCount ?? 0}단계 되돌릴 수 있음 · ${undoShortcut}`}
            aria-label="실행 취소"
            class="toolbar-menu-history-action"
            disabled={props.canUndo !== true || props.onUndo === undefined}
            type="button"
            onClick={() => {
              setMenuOpen(false)
              props.onUndo?.()
            }}
          >
            <span>Undo</span>
            <span class="editor-context-menu-shortcut" aria-hidden="true">
              {undoShortcut}
            </span>
          </Button>
          <Button
            aria-description={`${props.historyRedoCount ?? 0}단계 다시 실행할 수 있음 · ${redoShortcut}`}
            aria-label="다시 실행"
            class="toolbar-menu-history-action"
            disabled={props.canRedo !== true || props.onRedo === undefined}
            type="button"
            onClick={() => {
              setMenuOpen(false)
              props.onRedo?.()
            }}
          >
            <span>Redo</span>
            <span class="editor-context-menu-shortcut" aria-hidden="true">
              {redoShortcut}
            </span>
          </Button>
          <hr />
          <EditorHelp onOpen={() => setMenuOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
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
      <ToolbarMenu
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
        {(setMount) => <BrushSettingsMount setMount={setMount()} />}
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
    <PanelVisibilityControls visibility={props.panelVisibility} />
  </BaseHeader>
)
