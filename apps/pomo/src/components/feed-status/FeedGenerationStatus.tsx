import {useReadingStatusPreference} from 'src/features/feed-display-preferences'
import {type JSX, Show} from 'solid-js'
import {PButton} from '../PButton'
import type {PSceneStyle} from '../../features/focus-room-animation'
import * as m from '@paraglide/message'
import {FeedStatusSurface} from './Surface'
import {CLASSES} from './shared'

interface FeedGenerationStatusProps {
  readonly respectVisibilityPreference?: boolean
  readonly cancelDisabled: boolean
  readonly message: JSX.Element
  readonly onCancel: () => void
  readonly sceneStyle?: PSceneStyle
  readonly state: 'generating' | 'preparing'
}

export const FeedGenerationStatus = (props: FeedGenerationStatusProps) => {
  const preference = useReadingStatusPreference()
  return (
    <Show when={props.respectVisibilityPreference === false || preference.visible()}>
      <FeedStatusSurface sceneStyle={props.sceneStyle} state={props.state}>
        <span aria-hidden="true" class={CLASSES.feedStatusSpinner} />
        <span class={CLASSES.feedStatusCopy}>
          <strong>{m.feed_reading()}</strong>
          <small>{props.message}</small>
        </span>
        <PButton
          bordered
          transparent
          class={CLASSES.feedStatusAction}
          disabled={props.cancelDisabled}
          onPress={props.onCancel}
          size="small"
          tone="secondary"
        >
          {m.feed_stop()}
        </PButton>
      </FeedStatusSurface>
    </Show>
  )
}
