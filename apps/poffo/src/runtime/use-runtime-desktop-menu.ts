import {type Accessor, createEffect, onCleanup, onMount} from 'solid-js'
import type {useWorkspaceLayout} from './graph/use-workspace-layout'
import {
  DESKTOP_MENU_ACTION,
  type DesktopMenuAction,
  listenDesktopMenuAction,
  setDesktopMenuItemEnabled,
} from '../desktop/menu'
import {useFileDialog} from '../desktop/use-file-dialog'

interface UseRuntimeDesktopMenuProps {
  readonly active: Accessor<boolean>
  readonly desktopMenu: boolean
  readonly workspace: Accessor<ReturnType<typeof useWorkspaceLayout> | undefined>
  readonly onLoadModel: (file: File | undefined) => void
  readonly onSave: () => void
}

export const useRuntimeDesktopMenu = (props: UseRuntimeDesktopMenuProps) => {
  const dialog = useFileDialog()
  const openModel = async () => {
    const file = await dialog.openFile({extensions: ['json', 'poffo'], title: '모델 불러오기'})
    if (file !== undefined && props.active()) {
      props.onLoadModel(file)
    }
  }
  const openStudio = async () => {
    const file = await dialog.openFile({extensions: ['json'], title: '스튜디오 불러오기'})
    if (file !== undefined && props.active()) {
      props.workspace()?.importStudio(file)
    }
  }
  const handlers: Partial<Record<DesktopMenuAction, () => void>> = {
    [DESKTOP_MENU_ACTION.modelOpen]: openModel,
    [DESKTOP_MENU_ACTION.studioOpen]: openStudio,
    [DESKTOP_MENU_ACTION.studioSave]: () => props.onSave(),
  }
  createEffect(() => {
    if (props.desktopMenu) {
      const enabled = props.active()
      setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.modelOpen, enabled)
      setDesktopMenuItemEnabled(
        DESKTOP_MENU_ACTION.studioOpen,
        enabled && props.workspace() !== undefined,
      )
      setDesktopMenuItemEnabled(
        DESKTOP_MENU_ACTION.studioSave,
        enabled && props.workspace() !== undefined,
      )
    }
  })
  onMount(() => {
    if (!props.desktopMenu) {
      return
    }
    const handleAction = (action: DesktopMenuAction) => {
      if (!props.active()) {
        return
      }
      handlers[action]?.()
    }
    const unsubscribe = listenDesktopMenuAction(handleAction)
    onCleanup(unsubscribe)
  })
  onCleanup(() => {
    if (props.desktopMenu) {
      setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.modelOpen, false)
      setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.studioOpen, false)
      setDesktopMenuItemEnabled(DESKTOP_MENU_ACTION.studioSave, false)
    }
  })
  return {dismissError: dialog.dismissError, error: dialog.error, openStudio}
}
