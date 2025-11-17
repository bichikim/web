import {createSignal, useContext, createEffect, createMemo, onMount} from 'solid-js'
import {MaybeAccessor, resolveAccessor, nonAccessor} from '@winter-love/solid-use'
import {getDeepPositionKey, type DeepPosition} from 'src/utils/focus-controller/deep-position'
import {FocusControllerContext, FOCUS_CONTROLLER_CHANNEL} from './FocusController'
import {useDelegatedOn} from './DelegatedEvent'

export const useFocus = (deepPosition: MaybeAccessor<DeepPosition>) => {
  const deepPositionAccessor = resolveAccessor(deepPosition)
  const [isFocused, setIsFocused] = createSignal(false)
  const [payload, setPayload] = createSignal<any>(null)
  const focusControllerContext = useContext(FocusControllerContext)

  // focusControllerContext not provided
  if (!focusControllerContext) {
    return {
      isFocused,
      payload,
      setIsFocused,
    }
  }

  // focusControllerContext provided
  const {focusController, id, keyOptions} = focusControllerContext

  onMount(() => {
    focusController.registerFocus(deepPositionAccessor())
  })

  const deepPositionKey = createMemo(() =>
    getDeepPositionKey(deepPositionAccessor(), {
      ...keyOptions,
      id,
    }),
  )

  const deepPositionPayload = createMemo(() => {
    if (isFocused()) {
      return payload()
    }

    return null
  })

  useDelegatedOn(
    FOCUS_CONTROLLER_CHANNEL,
    deepPositionKey,
    nonAccessor((value) => {
      if (!value) {
        return
      }

      setIsFocused(value.focused)
      setPayload(value.payload)
    }),
  )

  const _setIsFocused = (focused: boolean) => {
    if (focused) {
      focusController.setFocus(deepPositionAccessor())
    } else {
      focusController.setFocus([])
    }
  }

  return {
    isFocused,
    payload: deepPositionPayload,
    setIsFocused: _setIsFocused,
  }
}
