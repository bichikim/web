import {usePSceneStyle} from '../../features/focus-room-animation'
import {useDesktopMode, useDesktopSceneSettingsListener} from '../../features/desktop-mode'
import {PPomodoro} from '../PPomodoro'
import {DesktopSurfaceFrame} from './Frame'
import * as m from '@paraglide/message'

export const DesktopPomodoro = () => {
  const desktopMode = useDesktopMode()
  const sceneStyle = usePSceneStyle()
  useDesktopSceneSettingsListener({onSceneStyleChange: sceneStyle.onSceneStyleChange})

  return (
    <DesktopSurfaceFrame
      accessibleLabel={m.desktop_pomodoro_label()}
      class="relative [&_.pomo-pomodoro]:relative [&_.pomo-pomodoro]:inset-auto"
      isVisible={desktopMode.mode() === 'desktop'}
      title={m.desktop_pomodoro_title()}
    >
      <PPomodoro sceneStyle={sceneStyle.sceneStyle()} />
    </DesktopSurfaceFrame>
  )
}
