import {DelegatedEventProvider} from './DelegatedEvent'
import {FocusControllerProvider, useFocusController} from './FocusController'
import {useFocus} from './focus'
import type {DeepPosition} from 'src/utils/focus-controller/deep-position'
import {SolidWindow} from './SolidWindow'
import {cva} from 'class-variance-authority'
import {createSignal, type JSX, Show} from 'solid-js'
import {type DirectionName, getDirection} from 'src/utils/focus-controller/direction'
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
  children?: JSX.Element
  deepPosition: DeepPosition
}

export const Focus = (props: FocusProps) => {
  const {isFocused, setIsFocused} = useFocus(() => props.deepPosition)

  const handleClick = () => {
    setIsFocused(!isFocused())
  }

  return (
    <button class={focusStyles({isFocused: isFocused()})} onClick={handleClick}>
      <Show when={isFocused()} fallback={<span class="w-2rem h-2rem">{props.children}</span>}>
        <span class="i-tabler:check text-8 bg-blue-500" />
      </Show>
    </button>
  )
}

export const FocusItemsSameLevel = () => {
  return (
    <div class="flex flex gap-2 rounded-md p-2">
      <div class="flex flex-col gap-2 b-dashed border-2 border-gray-300 rounded-md p-2">
        <span>0, 0</span>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 0, y: 0},
            ]}
          >
            <span>0, 0</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 1, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
        </div>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 0, y: 1},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 1, y: 1},
            ]}
          >
            <span>1, 1</span>
          </Focus>
        </div>
      </div>
      <div class="flex flex-col gap-2 b-dashed border-2 border-gray-300 rounded-md p-2">
        <span>0, 1</span>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 1, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
        </div>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 1},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 1, y: 1},
            ]}
          >
            <span>1, 1</span>
          </Focus>
        </div>
      </div>
    </div>
  )
}

export const FocusItemsDifferentLevel = () => {
  return (
    <div class="flex flex gap-2 rounded-md p-2">
      <div class="flex flex-col gap-2 b-dashed border-2 border-gray-300 rounded-md p-2">
        <span>0, 0</span>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 0, y: 0},
            ]}
          >
            <span>0, 0</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 1, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
        </div>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 0, y: 1},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 0, y: 0},
              {x: 1, y: 1},
            ]}
          >
            <span>1, 1</span>
          </Focus>
        </div>
      </div>
      <div class="flex flex-col gap-2 b-dashed border-2 border-gray-300 rounded-md p-2">
        <span>0, 1 - 0, 0</span>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 0},
              {x: 0, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 0},
              {x: 1, y: 0},
            ]}
          >
            <span>0, 1</span>
          </Focus>
        </div>
        <div class="flex gap-2">
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 0},
              {x: 0, y: 1},
            ]}
          >
            <span>0, 1</span>
          </Focus>
          <Focus
            deepPosition={[
              {x: 1, y: 0},
              {x: 0, y: 0},
              {x: 1, y: 1},
            ]}
          >
            <span>1, 1</span>
          </Focus>
        </div>
      </div>
    </div>
  )
}

export interface FocusControllerSampleBodyProps {
  readonly children?: JSX.Element
  readonly globalMap?: boolean
}

export const FocusControllerSampleBody = (props: FocusControllerSampleBodyProps) => {
  const [downUpKey, setDownUpKey] = createSignal<boolean>(false)
  const [downLeftKey, setDownLeftKey] = createSignal<boolean>(false)
  const [downDownKey, setDownDownKey] = createSignal<boolean>(false)
  const [downRightKey, setDownRightKey] = createSignal<boolean>(false)
  const focusController = useFocusController()

  const handleDirection = (direction: DirectionName) => {
    focusController.moveFocus(getDirection(direction))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        setDownUpKey(true)
        handleDirection('up')
        break
      }

      case 'ArrowDown': {
        setDownDownKey(true)
        handleDirection('down')
        break
      }

      case 'ArrowLeft': {
        setDownLeftKey(true)
        handleDirection('left')
        break
      }

      case 'ArrowRight': {
        setDownRightKey(true)
        handleDirection('right')
        break
      }
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp': {
        setDownUpKey(false)
        break
      }

      case 'ArrowDown': {
        setDownDownKey(false)
        break
      }

      case 'ArrowRight': {
        setDownRightKey(false)
        break
      }

      case 'ArrowLeft': {
        setDownLeftKey(false)
        break
      }
    }
  }

  return (
    <div class="flex flex-col gap-2">
      {props.children}

      <SolidWindow onKeyDown={onKeyDown} onKeyUp={onKeyUp} globalMap={props.globalMap} />
      <div class="flex gap-2 justify-center">
        <KeyCap
          childClassName="i-tabler:caret-up-filled"
          pressed={downUpKey()}
          onClick={() => handleDirection('up')}
        />
      </div>
      <div class="flex gap-2 justify-center">
        <KeyCap
          childClassName="i-tabler:caret-left-filled"
          pressed={downLeftKey()}
          onClick={() => handleDirection('left')}
        />
        <KeyCap
          childClassName="i-tabler:caret-down-filled"
          pressed={downDownKey()}
          onClick={() => handleDirection('down')}
        />
        <KeyCap
          childClassName="i-tabler:caret-right-filled"
          pressed={downRightKey()}
          onClick={() => handleDirection('right')}
        />
      </div>
    </div>
  )
}

export interface FocusControllerSampleContainerProps {
  children?: JSX.Element
}

export const FocusControllerSampleContainer = (props: FocusControllerSampleContainerProps) => {
  return (
    <DelegatedEventProvider>
      <FocusControllerProvider>
        <FocusControllerSampleBody>{props.children}</FocusControllerSampleBody>
      </FocusControllerProvider>
    </DelegatedEventProvider>
  )
}
