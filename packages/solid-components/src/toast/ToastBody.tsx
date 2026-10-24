import {type ComponentProps} from 'solid-js'
import {ToastContentContext} from './context'
import {ToastRegion} from './ToastRegion'
import {Portal} from 'solid-js/web'
import {Close} from '../close'

export interface ToastBodyProps extends ComponentProps<'div'> {
  //
}

/** Renders up to three provider messages in a portal with their item contexts. */
export const ToastBody = (props: ToastBodyProps) => {
  return (
    <Portal>
      <div {...props}>
        <ToastRegion>
          {(message, dismiss) => (
            <Close.Provider show={true} onShowChange={dismiss}>
              <ToastContentContext.Provider value={{message}}>
                {props.children}
              </ToastContentContext.Provider>
            </Close.Provider>
          )}
        </ToastRegion>
      </div>
    </Portal>
  )
}
