import {DelegatedEventProvider} from './DelegatedEvent'
import {FocusControllerProvider, useFocusController} from './FocusController'
import {useFocus} from './focus'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {SolidWindow} from './SolidWindow'
import {cva} from 'class-variance-authority'
import {Show, createSignal} from 'solid-js'
import {getDirection} from 'src/utils/focus-controller/direction'
import {KeyCap} from './KeyCap'

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
  const [downUpKey, setDownUpKey] = createSignal<boolean>(false)
  const [downLeftKey, setDownLeftKey] = createSignal<boolean>(false)
  const [downDownKey, setDownDownKey] = createSignal<boolean>(false)
  const [downRightKey, setDownRightKey] = createSignal<boolean>(false)
  const focusController = useFocusController()

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        setDownUpKey(true)
        focusController.moveFocus(getDirection('up'))
        break
      case 'ArrowDown':
        setDownDownKey(true)
        focusController.moveFocus(getDirection('down'))
        break
      case 'ArrowLeft':
        setDownLeftKey(true)
        focusController.moveFocus(getDirection('left'))
        break
      case 'ArrowRight':
        setDownRightKey(true)
        focusController.moveFocus(getDirection('right'))
        break
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        setDownUpKey(false)
        break
      case 'ArrowDown':
        setDownDownKey(false)
        break
      case 'ArrowRight':
        setDownRightKey(false)
        break
      case 'ArrowLeft':
        setDownLeftKey(false)
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
      <SolidWindow onKeyDown={onKeyDown} onKeyUp={onKeyUp} />
      <div class="flex gap-2 justify-center">
        <KeyCap childClassName="i-tabler:caret-up-filled" pressed={downUpKey()} />
      </div>
      <div class="flex gap-2">
        <KeyCap childClassName="i-tabler:caret-left-filled" pressed={downLeftKey()} />
        <KeyCap childClassName="i-tabler:caret-down-filled" pressed={downDownKey()} />
        <KeyCap childClassName="i-tabler:caret-right-filled" pressed={downRightKey()} />
      </div>
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
