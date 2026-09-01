import {cx} from 'class-variance-authority'
import {usePSceneStyle} from '../../features/focus-room-animation'
import {useDesktopMode, useDesktopSceneSettingsListener} from '../../features/desktop-mode'
import {PMusicPlayer} from '../PMusicPlayer'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'

export const DesktopPlayer = () => {
  const desktopMode = useDesktopMode()
  const sceneStyle = usePSceneStyle()
  useDesktopSceneSettingsListener({onSceneStyleChange: sceneStyle.onSceneStyleChange})

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_player_label()}
      class={cx(
        'flex items-end [&_.pomo-player-stage]:relative',
        '[&_.pomo-player-stage]:inset-auto [&_.pomo-player-stage]:w-full',
      )}
      isVisible={desktopMode.mode() === 'desktop'}
      title={m.desktop_player_title()}
    >
      <PMusicPlayer expanded sceneStyle={sceneStyle.sceneStyle()} />
    </DesktopSurfaceFrame>
  )
}
