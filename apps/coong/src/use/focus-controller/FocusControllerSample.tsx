import {DelegatedEventProvider} from './DelegatedEvent'
import {FocusControllerProvider, useFocusController} from './FocusController'
import {useFocus} from './focus'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {SolidWindow} from './SolidWindow'
import {cva} from 'class-variance-authority'
import {Show} from 'solid-js'
import {Direction, getDirection} from 'src/utils/focus-controller/direction'

const focusStyles = cva('border-2  rounded-md p-2 text-sm c-black flex items-center', {
  defaultVariants: {
    isFocused: false,
  },
  variants: {
    isFocused: {
      false: 'border-gray-300',
      true: 'border-blue-500',
    },
  },
})
export interface FocusProps {
  deepPosition: DeepPosition
}

export const Focus = (props: FocusProps) => {
  const {isFocused, setIsFocused} = useFocus(() => props.deepPosition)

  const handleClick = () => {
    setIsFocused(!isFocused())
  }

  return (
    <button class={focusStyles({isFocused: isFocused()})} onClick={handleClick}>
      <Show when={isFocused()} fallback={<span class="w-2rem h-2rem" />}>
        <span class="i-tabler:check text-8 bg-blue-500" />
      </Show>
    </button>
  )
}

export const FocusControllerSampleBody = () => {
  const focusController = useFocusController()

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        focusController.moveFocus(getDirection('up'))
        break
      case 'ArrowDown':
        focusController.moveFocus(getDirection('down'))
        break
      case 'ArrowLeft':
        focusController.moveFocus(getDirection('left'))
        break
      case 'ArrowRight':
        focusController.moveFocus(getDirection('right'))
        break
    }
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Focus deepPosition={[{x: 0, y: 0}]} />
        <Focus deepPosition={[{x: 1, y: 0}]} />
      </div>
      <div class="flex gap-2">
        <Focus deepPosition={[{x: 0, y: 1}]} />
        <Focus deepPosition={[{x: 1, y: 1}]} />
      </div>
      <SolidWindow onKeyDown={onKeyDown} />
    </div>
  )
}

export const FocusControllerSample = () => {
  return (
    <DelegatedEventProvider>
      <FocusControllerProvider>
        <FocusControllerSampleBody />
      </FocusControllerProvider>
    </DelegatedEventProvider>
  )
}
