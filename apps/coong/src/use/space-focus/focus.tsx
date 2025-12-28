import {
  Accessor,
  createSignal,
  createUniqueId,
  createEffect,
  untrack,
  createContext,
  useContext,
  createMemo,
  type JSX,
  onCleanup,
  Setter,
} from 'solid-js'
import {resolveAccessor, MaybeAccessor, nonAccessor} from '@winter-love/solid-use'
import {FocusRect, PreventMoveOptions, createFocusRect, type Direction} from 'src/utils/space-focus/focus-store'
import {measureLayout} from 'src/utils/space-focus/measure-layout'
import {createFocusController, type FocusController} from 'src/utils/space-focus/focus-controller'
import {useDelegatedOn, useDelegatedEmitHandler} from 'src/use/focus-controller/DelegatedEvent'

const FocusGroupContext = createContext<Accessor<FocusRect | null>>(() => null)
export const FocusControllerContext = createContext<FocusController | null>(null)

export interface UseFocusOptions {
  isInactive?: boolean
  preventMove?: PreventMoveOptions
}

const FOCUS_CHANNEL = 'focus-controller'

export const useFocusGroup = (
  element: MaybeAccessor<HTMLElement | null>,
  options?: MaybeAccessor<UseFocusOptions>,
): [Accessor<FocusRect>, Setter<FocusRect>, string] => {
  const elementAccessor = resolveAccessor(element)
  const optionsAccessor = resolveAccessor(options)
  const parentFocusGroup = useContext(FocusGroupContext)
  const id = createUniqueId()

  const {isInactive = false, preventMove = {}} = untrack(() => optionsAccessor() ?? {})

  const [focusRect, setFocusRect] = createSignal<FocusRect>(
    createFocusRect(id, parentFocusGroup(), () => untrack(() => measureLayout(elementAccessor())), {
      isInactive,
      preventMove,
    }),
  )

  createEffect(() => {
    const _element = elementAccessor()
    const parent = parentFocusGroup()
    const {isInactive = false, preventMove = {}} = optionsAccessor() ?? {}
    const _focusRect = untrack(() => focusRect())

    untrack(() => {
      parent?.children.add(focusRect())

      setFocusRect((prev) => {
        prev.isDirty = true
        prev.parent = parent
        prev.getRect = () => untrack(() => measureLayout(_element))
        prev.isInactive = isInactive ?? false
        prev.preventMove = preventMove ?? {}

        // don't return new object, just update the value, because copying will lose the child and parent connections
        return prev
      })
    })

    onCleanup(() => {
      parent?.children.delete(_focusRect)
    })
  })

  return [focusRect, setFocusRect, id]
}

export const useFocus = (
  element: MaybeAccessor<HTMLElement | null>,
  options?: MaybeAccessor<UseFocusOptions>,
): [Accessor<boolean>, Setter<boolean>] => {
  const [isFocused, setIsFocused] = createSignal(false)
  const [focusRect, _, id] = useFocusGroup(element, options)
  const focusController = useContext(FocusControllerContext)

  useDelegatedOn(
    FOCUS_CHANNEL,
    id,
    nonAccessor((value: {focused: boolean}) => {
      setIsFocused(value?.focused ?? false)
    }),
  )

  const handleFocus: Setter<boolean> = (value: boolean | ((prev: boolean) => boolean)) => {
    const _value = typeof value === 'function' ? value(isFocused()) : value

    if (_value) {
      focusController?.setFocus(focusRect())
    } else {
      focusController?.setFocus(null)
    }
  }

  return [isFocused, handleFocus]
}

export interface FocusGroupProps {
  children: JSX.Element
  element: HTMLElement | null
}

export const FocusGroup = (props: FocusGroupProps) => {
  const element = createMemo(() => {
    return props.element
  })
  const [focusGroup] = useFocusGroup(element)

  return <FocusGroupContext.Provider value={focusGroup}>{props.children}</FocusGroupContext.Provider>
}

export interface FocusGroupWithElementProps {
  children: JSX.Element
}

export const useFocusController = () => {
  const emitFocus = useDelegatedEmitHandler()

  return createFocusController((rect, focused) => {
    emitFocus(FOCUS_CHANNEL, rect.id, {focused})
  })
}

export interface FocusControllerProviderProps {
  children: JSX.Element
}

export const FocusControllerProvider = (props: FocusControllerProviderProps) => {
  const focusController = useFocusController()

  return <FocusControllerContext.Provider value={focusController}>{props.children}</FocusControllerContext.Provider>
}

export const useFocusControllerContext = () => {
  return useContext(FocusControllerContext)
}

export const FocusGroupWithElement = (props: FocusGroupWithElementProps) => {
  const [element, setElement] = createSignal<HTMLElement | null>(null)
  const [focusGroup] = useFocusGroup(element)

  return (
    <div ref={setElement}>
      <FocusGroupContext.Provider value={focusGroup}>{props.children}</FocusGroupContext.Provider>
    </div>
  )
}
