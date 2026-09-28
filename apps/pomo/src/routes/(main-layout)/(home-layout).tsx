import type {RouteDefinition} from '@solidjs/router'
import type {ParentProps} from 'solid-js'

import {SoundEffectsProvider} from 'src/features/sound-effects'

export const route = {
  info: {focusRoomPlayback: true},
} satisfies RouteDefinition

export default function HomeLayout(props: ParentProps) {
  return <SoundEffectsProvider>{props.children}</SoundEffectsProvider>
}
