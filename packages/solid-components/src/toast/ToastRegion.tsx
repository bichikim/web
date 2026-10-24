import {For, useContext} from 'solid-js'
import {ToastInnerContext} from './context'
import {ToastEntry, type ToastEntryProps} from './ToastEntry'

export interface ToastRegionProps {
  readonly deferDismiss?: boolean
  readonly children: ToastEntryProps['children']
}

export const ToastRegion = (props: ToastRegionProps) => {
  const state = useContext(ToastInnerContext)
  return (
    <For each={state.visible()}>
      {(message) => (
        <ToastEntry deferDismiss={props.deferDismiss} message={message}>
          {props.children}
        </ToastEntry>
      )}
    </For>
  )
}
