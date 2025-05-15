import {ComponentProps, For, useContext} from 'solid-js'
import {ToastContentContext, ToastContext, ToastInnerContext} from './context'
import {Portal} from 'solid-js/web'
import {Close} from 'src/close'

export interface ToastBodyProps extends ComponentProps<'div'> {
  //
}

/**
 * ToastBody component is a container for Toast.Item components.
 * This component is used within a ToastProvider and renders a list of toast messages.
 *
 * @component
 * @example
 * ```tsx
 * <Toast.Provider>
 *   <Toast.Body class="fixed top-0 left-0 flex flex-col gap-2">
 *     <Toast.Item class="bg-white rounded-lg p-4 shadow-lg">
 *       <Toast.Content />
 *       <Toast.Actions>
 *         <Toast.Action />
 *       </Toast.Actions>
 *     </Toast.Item>
 *   </Toast.Body>
 * </Toast.Provider>
 * ```
 */
export const ToastBody = (props: ToastBodyProps) => {
  const {messages} = useContext(ToastInnerContext)
  const {turnOffMessage} = useContext(ToastContext)

  return (
    <Portal>
      <div {...props}>
        <For each={[...messages().values()]}>
          {(message) => {
            // The reason show is always true is because the message is not rendered when it's deleted.
            return (
              <Close.Provider show={true} onShowChange={() => turnOffMessage(message.id)}>
                <ToastContentContext.Provider value={{message}}>{props.children}</ToastContentContext.Provider>
              </Close.Provider>
            )
          }}
        </For>
      </div>
    </Portal>
  )
}
