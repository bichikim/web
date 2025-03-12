import {Toast} from '@winter-love/solid-components'
import {ParentProps} from 'solid-js'
import {SButton} from 'src/components/button'
import {SDivider} from 'src/components/divider'

export interface SToastProviderProps extends ParentProps {
  //
}

const bodyStyle = `:uno:
fixed bottom-2 left-2 flex flex-col gap-2
`

const itemStyle = `:uno:
flex flex-col gap-2 bg-opacity-90 b-1 b-white bg-white rd-1 backdrop-blur-sm p-2 max-w-50vm
`

export const SToastProvider = (props: SToastProviderProps) => {
  return (
    <Toast.Provider>
      <Toast.Body class={bodyStyle}>
        <Toast.Item class={itemStyle}>
          <div class="p-1">
            <Toast.Title component="h4" class="font-bold" />
            <Toast.Message class="text-md color-gray-600" />
          </div>
          <Toast.ActionBody class="">
            <SDivider type="horizontal" class="mb-2" />
            <div class="flex gap-2 p-1">
              <Toast.ActionList class="flex gap-2 p-1">
                <Toast.Action component={SButton} />
              </Toast.ActionList>
            </div>
          </Toast.ActionBody>
        </Toast.Item>
      </Toast.Body>
      {props.children}
    </Toast.Provider>
  )
}
