import {usePDisplayPreferences} from 'src/features/focus-room-display-preferences'
import {cx} from 'class-variance-authority'
import {createSignal} from 'solid-js'
import {usePSceneStyle} from '../../features/focus-room-animation'
import {useDesktopMode, useDesktopSceneSettingsListener} from '../../features/desktop-mode'
import {PMusicPlayer} from '../p-music-player/PMusicPlayer'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'

export const DesktopPlayer = () => {
  const desktopMode = useDesktopMode()
  const displayPreferences = usePDisplayPreferences()
  const sceneStyle = usePSceneStyle()
  const [expanded, setExpanded] = createSignal(true)
  useDesktopSceneSettingsListener({onSceneStyleChange: sceneStyle.onSceneStyleChange})

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_player_label()}
      class={cx(
        'flex w-[30.5rem] items-end [&_.pomo-player-stage]:relative',
        '[&_.pomo-player-stage]:inset-auto [&_.pomo-player-stage]:h-full [&_.pomo-player-stage]:w-full',
      )}
      contentClass="w-full"
      isVisible={
        desktopMode.mode() === 'desktop' &&
        displayPreferences.isReady() &&
        displayPreferences.playerVisible()
      }
      title={m.desktop_player_title()}
    >
      <div class={cx('w-full', expanded() ? 'h-[19.875rem]' : 'h-fit')}>
        <PMusicPlayer
          backdropBlur={false}
          expanded={expanded()}
          onExpandedChange={setExpanded}
          sceneStyle={sceneStyle.sceneStyle()}
        />
      </div>
    </DesktopSurfaceFrame>
  )
}
