import {createContext, type JSX, untrack, useContext} from 'solid-js'
import {createFocusController, FocusController} from 'src/utils/focus-controller/focus-controller'
import {createUuid} from '@winter-love/utils'
import {DelegatedEventContext, useDelegatedEmitHandler} from './DelegatedEvent'
import {
  type DeepPosition,
  getDeepPositionKey,
  type KeyDeepPositionOptions,
  type KeyOptions,
} from 'src/utils/focus-controller/deep-position'

export interface FocusControllerContextValue {
  readonly focusController: FocusController
  readonly globalMap?: boolean
  readonly id: string
  readonly keyOptions: Readonly<KeyOptions>
}

export interface FocusControllerProviderProps extends Readonly<KeyOptions> {
  children?: JSX.Element
  readonly globalMap?: boolean
  readonly id?: string
  readonly onChangeFocus?: (deepPosition: DeepPosition, focused: boolean) => void
}

const createEmptyFocusController = (): FocusControllerContextValue => {
  return {
    focusController: {
      active: () => {
        console.warn('focusController is not provided')
      },
      deepPosition: [],
      moveFocus: () => {
        console.warn('focusController is not provided')

        return null
      },
      positionMap: new Map(),
      registerFocus: () => {
        console.warn('focusController is not provided')
      },
      setActiveFocus: () => {
        console.warn('focusController is not provided')
      },
      setFocus: () => {
        console.warn('focusController is not provided')
      },
      setPreventMoveFocus: () => {
        console.warn('focusController is not provided')
      },
      setPreviousFocus: () => {
        console.warn('focusController is not provided')
      },
      unregisterFocus: () => {
        console.warn('focusController is not provided')
      },
    },
    globalMap: false,
    id: '',
    keyOptions: {},
  }
}

export const FocusControllerContext = createContext<FocusControllerContextValue>(createEmptyFocusController())

const getUuid = createUuid()

export const FOCUS_CONTROLLER_CHANNEL = 'focus-controller'

export const FocusControllerProvider = (props: FocusControllerProviderProps) => {
  const id = untrack(() => props.id ?? `id${String(getUuid())}`)
  const globalMap = untrack(() => props.globalMap ?? false)

  const keyOptions = untrack(() => ({
    connector: props.connector,
    separator: props.separator,
  }))

  const {isFake: isDelegatedEventContextFake} = useContext(DelegatedEventContext)

  if (isDelegatedEventContextFake) {
    console.warn('DelegatedEventContext is not provided')
  }

  const delegatedEmitHandler = useDelegatedEmitHandler()

  const onChangeFocus = (deepPosition: DeepPosition, focused: boolean) => {
    props.onChangeFocus?.(deepPosition, focused)

    delegatedEmitHandler(
      // focus delegate event channel
      FOCUS_CONTROLLER_CHANNEL,
      // deep position key
      getDeepPositionKey(deepPosition, {
        ...keyOptions,
        id,
      }),
      // value
      {
        focused,
      },
    )
  }

  const focusController = createFocusController(onChangeFocus)

  return (
    <FocusControllerContext.Provider
      value={{
        focusController,
        globalMap,
        id,
        keyOptions,
      }}
    >
      {props.children}
    </FocusControllerContext.Provider>
  )
}

export const useFocusController = () => {
  const {focusController} = useContext(FocusControllerContext)

  return focusController
}
