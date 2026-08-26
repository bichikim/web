import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {getDesktopErrorMessage} from './error'
import type {DesktopBackgroundInteraction} from './model'
import {getDesktopBackgroundInteraction, setDesktopBackgroundInteraction} from './runtime'

export interface DesktopBackgroundInteractionController {
  readonly error: Accessor<string | null>
  readonly interaction: Accessor<DesktopBackgroundInteraction>
  readonly isChanging: Accessor<boolean>
  readonly onInteractionChange: (interaction: DesktopBackgroundInteraction) => Promise<void>
}

/** Owns the native background input state exposed by the desktop control window. */
export const useDesktopBackgroundInteraction = (): DesktopBackgroundInteractionController => {
  const [interaction, setInteraction] = createSignal<DesktopBackgroundInteraction>('interactive')
  const [isChanging, setIsChanging] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  let interactionRevision = 0

  onMount(() => {
    let isDisposed = false
    const initialRevision = interactionRevision

    getDesktopBackgroundInteraction()
      .then((currentInteraction) => {
        if (!isDisposed && interactionRevision === initialRevision) {
          setInteraction(currentInteraction)
        }
      })
      .catch((interactionError: unknown) => {
        if (!isDisposed && interactionRevision === initialRevision) {
          setError(getDesktopErrorMessage(interactionError))
        }
      })

    onCleanup(() => {
      isDisposed = true
    })
  })

  const onInteractionChange = async (nextInteraction: DesktopBackgroundInteraction) => {
    if (isChanging() || nextInteraction === interaction()) {
      return
    }

    interactionRevision += 1
    setIsChanging(true)
    setError(null)
    try {
      await setDesktopBackgroundInteraction(nextInteraction)
      setInteraction(nextInteraction)
    } catch (interactionError: unknown) {
      setError(getDesktopErrorMessage(interactionError))
      throw interactionError
    } finally {
      setIsChanging(false)
    }
  }

  return {error, interaction, isChanging, onInteractionChange}
}
