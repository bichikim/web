import {Toast} from '@winter-love/solid-components'
import {ParentProps} from 'solid-js'
import {SButton} from 'src/components/button'
import {SDivider} from 'src/components/divider'

export interface SToastProviderProps extends ParentProps {
  //
}

export const SToastProvider = (props: SToastProviderProps) => {
  return (
    <Toast.Provider>
      <Toast.Body class="fixed bottom-2 left-2 flex flex-col gap-2">
        <Toast.Item class="bg-white rounded-lg p-4 shadow-lg flex flex-col gap-2">
          <Toast.Title />
          <Toast.Message />
          <SDivider type="horizontal" class="mx-2" />
          <Toast.Actions class="flex gap-2 p-1">
            <Toast.Action component={SButton} />
          </Toast.Actions>
        </Toast.Item>
      </Toast.Body>
      {props.children}
    </Toast.Provider>
  )
}
