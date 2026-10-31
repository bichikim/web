import {useWorkspace} from '../../workspace/context'
import {
  EditorToast,
  type PuppetExampleDocument,
  useEditorPortalMount,
} from '@winter-love/puppet/editor'
import {FileAction} from '../FileAction'
import {Popover} from '@kobalte/core/popover'
import {Button} from '@kobalte/core/button'
import {EditorHelp} from '../EditorHelp'
import {createEffect, createSignal, For, Show} from 'solid-js'
import {EditorMenuAction} from './EditorMenuAction'
import {hasDesktopMenu} from '../../desktop/menu'
import {useEditorToolbarDesktopMenu} from './use-editor-toolbar-desktop-menu'
import type {EditorToolbarMenuProps} from './types'

export const EditorToolbarMenu = (props: EditorToolbarMenuProps) => {
  const desktopMenu = hasDesktopMenu()
  const macPlatform = /Mac|iPhone|iPad|iPod/u.test(globalThis.navigator?.platform ?? '')
  const undoShortcut = macPlatform ? '⌘Z' : 'Ctrl+Z'
  const redoShortcut = macPlatform ? '⇧⌘Z' : 'Ctrl+Y'
  const workspace = useWorkspace()
  const [menuOpen, setMenuOpen] = createSignal(false)
  const [helpOpen, setHelpOpen] = createSignal(false)
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
  const handleHelpOpen = () => setHelpOpen(true)
  const nativeMenu = useEditorToolbarDesktopMenu({
    desktopMenu,
    onExampleOpen: handleExampleOpen,
    onHelpOpen: handleHelpOpen,
    onRecoveryOpen: handleRecoveryOpen,
    toolbar: props,
    workspace,
  })

  return (
    <>
      <Popover forceMount open={menuOpen()} onOpenChange={setMenuOpen}>
        <Show when={!desktopMenu}>
          <Popover.Trigger
            ref={setTrigger}
            aria-label="메인 메뉴"
            class="toolbar-menu-trigger"
            type="button"
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-menu-2" />
          </Popover.Trigger>
        </Show>
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
            <EditorMenuAction label="문서 저장" onClose={close} onSelect={props.onPoffoExport} />
            <EditorMenuAction label="JSON 내보내기" onClose={close} onSelect={props.onExport} />
            <EditorMenuAction
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
            <EditorHelp
              open={helpOpen()}
              onOpenChange={setHelpOpen}
              onOpen={() => setMenuOpen(false)}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover>
      <EditorToast message={nativeMenu.error() ?? undefined} onDismiss={nativeMenu.dismissError} />
    </>
  )
}
