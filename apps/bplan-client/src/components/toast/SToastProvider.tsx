import {Toast} from '@winter-love/solid-components'
import {ParentProps} from 'solid-js'
import {SButton} from 'src/components/button'
import {SDivider} from 'src/components/divider'

export interface SToastProviderProps extends ParentProps {
  //
}

const bodyStyle = `:uno:
fixed top-2 left-2 flex flex-col gap-2 justify-end items-start sm:w-80% md:w-50%
w-[calc(100%-1rem)]
`

const itemStyle = `:uno:
flex flex-col bg-opacity-90 b-1 b-white bg-gray-100 rd-1 backdrop-blur-sm p-0 max-w-50vm shadow-md items-start
`

export const SToastProvider = (props: SToastProviderProps) => {
  return (
    <Toast.Provider>
      <Toast.Body class={bodyStyle}>
        <Toast.Item class={itemStyle}>
          <div class="px-3 pt-3 pb-2 bg-white flex flex-col justify-start items-start">
            <Toast.Title component="h4" class="font-bold text-left" />
            <Toast.Message class="text-md color-gray-600 text-left" />
          </div>
          <Toast.ActionBody class="w-full">
            <SDivider type="horizontal" class="w-full" />
            <div class="flex gap-2 p-3">
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
