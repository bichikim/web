import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {useSelectMenu2Context} from './context'

export interface UsePanelProps {
  panelElement: Accessor<HTMLDivElement | undefined>
}

/** Registers a panel element with `HSelectRoot` and exposes positioning from context. */
export const usePanel = (props: UsePanelProps) => {
  const {left, listId, registerPanel, top, unregisterPanel} = useSelectMenu2Context()

  createEffect(() => {
    const element = props.panelElement()

    if (!element) {
      return
    }

    registerPanel(element)

    onCleanup(() => {
      unregisterPanel(element)
    })
  })

  return {
    left,
    listId,
    top,
  }
}
