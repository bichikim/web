import {createEffect, createSignal, type JSX, splitProps} from 'solid-js'
import {useSelectMenu2Context} from './context'
import {SELECT_MENU_PANEL_LEFT_VAR, SELECT_MENU_PANEL_TOP_VAR} from './panel-css-vars'
import {usePanel} from './use-panel'

export interface HSelectPanelProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'ref' | 'style'
> {
  children: JSX.Element
  popover?: 'auto' | 'manual'
}

/** Headless popover panel (Popover API) positioned from anchor bounds. */
export const HSelectPanel = (props: HSelectPanelProps) => {
  const [local, panelProps] = splitProps(props, [
    'children',
    'class',
    'id',
    'onToggle',
    'popover',
    'role',
  ])
  const [panelElement, setPanelElement] = createSignal<HTMLDivElement>()
  const {left, listId, top} = usePanel({panelElement})
  const {onClose, open} = useSelectMenu2Context()
  const popoverMode = () => local.popover ?? 'auto'

  createEffect(() => {
    const panel = panelElement()

    if (!panel) {
      return
    }

    if (open()) {
      panel.showPopover?.()

      return
    }

    panel.hidePopover?.()
  })

  const handleToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
    if (event.newState === 'closed') {
      onClose()
    }

    if (typeof local.onToggle === 'function') {
      local.onToggle(event)
    }
  }

  return (
    <div
      {...panelProps}
      ref={setPanelElement}
      id={local.id ?? listId}
      popover={popoverMode()}
      role={local.role ?? 'menu'}
      class={local.class}
      style={{
        [SELECT_MENU_PANEL_LEFT_VAR]: `${left()}px`,
        [SELECT_MENU_PANEL_TOP_VAR]: `${top()}px`,
      }}
      onToggle={handleToggle}
    >
      {local.children}
    </div>
  )
}
