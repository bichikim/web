import {Toast} from '@winter-love/solid-components'
import {ParentProps} from 'solid-js'
import {SToastItem} from './SToastItem'

export interface SToastProviderProps extends ParentProps {
  //
}

export const SToastProvider = (props: SToastProviderProps) => {
  return (
    <Toast.Provider>
      <Toast.Body class="fixed bottom-2 left-2 flex flex-col gap-2">
        {(message) => <SToastItem {...message} />}
      </Toast.Body>
      {props.children}
    </Toast.Provider>
  )
}
