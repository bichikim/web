import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import type {WidgetBackground} from '../features/widget-preview/backgrounds'
import type {StoryTransition} from '../features/desktop-story/types'
import {SDesktopBackdrop} from './SDesktopBackdrop'
import {SStoryMask} from './SStoryMask'

interface SPlaygroundBackdropProps {
  /** Background shown by either the user or the incoming product chapter. */
  readonly background?: WidgetBackground
  /** Background retained ahead of the diagonal scene boundary. */
  readonly previousBackground?: WidgetBackground
  /** Warm the second animated scene after scrolling starts, preserving the first canvas. */
  readonly prepareStreet?: boolean
  /** Reveal the incoming background while retaining the outgoing one. */
  readonly transition?: StoryTransition | null
}

export const SPlaygroundBackdrop = (props: SPlaygroundBackdropProps) => {
  const [streetMounted, setStreetMounted] = createSignal(false)
  const background = createMemo(() => props.background ?? 'profile')
  const mask = createMemo(() =>
    props.previousBackground && props.previousBackground !== background() ? props.transition : null,
  )
  const profileVisible = createMemo(
    () => background() === 'profile' || Boolean(mask() && props.previousBackground === 'profile'),
  )
  const streetVisible = createMemo(
    () =>
      background() === 'street-front' ||
      Boolean(mask() && props.previousBackground === 'street-front'),
  )
  createEffect(() => {
    if (props.prepareStreet || streetVisible()) {
      setStreetMounted(true)
    }
  })
  return (
    <>
      <SStoryMask
        hidden={!profileVisible()}
        transition={mask()}
        outgoing={Boolean(mask() && props.previousBackground === 'profile')}
      >
        <SDesktopBackdrop background="profile" playing={profileVisible()} />
      </SStoryMask>
      <Show when={streetMounted()}>
        <SStoryMask
          hidden={!streetVisible()}
          transition={mask()}
          outgoing={Boolean(mask() && props.previousBackground === 'street-front')}
        >
          <SDesktopBackdrop background="street-front" playing={streetVisible()} />
        </SStoryMask>
      </Show>
    </>
  )
}
