import {usePDisplayPreferences} from 'src/features/focus-room-display-preferences'
import {cx} from 'class-variance-authority'
import {createSignal, onCleanup, onMount} from 'solid-js'
import {usePSceneStyle} from '../../features/focus-room-animation'
import {useDesktopMode, useDesktopSceneSettingsListener} from '../../features/desktop-mode'
import {PMusicPlayer} from '../p-music-player/PMusicPlayer'
import type {MusicPlaybackActions} from '../music-player/types'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'
import {
  createDesktopMusicActionChannel,
  type DesktopMusicAction,
  isDesktopMusicActionMessage,
} from '../../features/desktop-mode/desktop-music-actions'

const runMusicAction = (actions: MusicPlaybackActions, actionId: DesktopMusicAction) => {
  switch (actionId) {
    case 'music-start':
      actions.play()
      return
    case 'music-stop':
      actions.pause()
      return
    default: {
      const exhaustiveAction: never = actionId
      return exhaustiveAction
    }
  }
}

export const DesktopPlayer = () => {
  const desktopMode = useDesktopMode()
  const displayPreferences = usePDisplayPreferences()
  const sceneStyle = usePSceneStyle()
  const [expanded, setExpanded] = createSignal(true)
  const [playbackActions, setPlaybackActions] = createSignal<MusicPlaybackActions | null>(null)
  let pendingMusicActions: DesktopMusicAction[] = []
  useDesktopSceneSettingsListener({onSceneStyleChange: sceneStyle.onSceneStyleChange})

  const isPlayerVisible = () =>
    desktopMode.mode() === 'desktop' &&
    displayPreferences.isReady() &&
    displayPreferences.playerVisible()

  const handlePlaybackActionsReady = (actions: MusicPlaybackActions | null) => {
    setPlaybackActions(actions)
    if (actions === null) {
      return
    }

    const pendingActions = pendingMusicActions
    pendingMusicActions = []
    for (const actionId of pendingActions) {
      runMusicAction(actions, actionId)
    }
  }

  onMount(() => {
    const channel = createDesktopMusicActionChannel()
    if (channel === null) {
      return
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      const message = event.data
      const actions = playbackActions()
      if (!isDesktopMusicActionMessage(message)) {
        return
      }

      if (actions === null) {
        if (isPlayerVisible()) {
          pendingMusicActions.push(message.actionId)
        }
        return
      }

      runMusicAction(actions, message.actionId)
    }
    channel.addEventListener('message', handleMessage)
    onCleanup(() => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    })
  })

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_player_label()}
      class={cx(
        'flex w-[30.5rem] items-end [&_.pomo-player-stage]:relative',
        '[&_.pomo-player-stage]:inset-auto [&_.pomo-player-stage]:h-full [&_.pomo-player-stage]:w-full',
      )}
      contentClass="w-full"
      isVisible={isPlayerVisible()}
      title={m.desktop_player_title()}
    >
      <div class={cx('w-full', expanded() ? 'h-[19.875rem]' : 'h-fit')}>
        <PMusicPlayer
          backdropBlur={false}
          expanded={expanded()}
          onExpandedChange={setExpanded}
          onPlaybackActionsReady={handlePlaybackActionsReady}
          sceneStyle={sceneStyle.sceneStyle()}
        />
      </div>
    </DesktopSurfaceFrame>
  )
}
