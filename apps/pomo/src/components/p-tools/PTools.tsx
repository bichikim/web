import * as m from '@paraglide/message'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {PButton} from '../p-button/PButton'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {getPomoIconClass} from '../icon-style'
import {PScribbleCircleControl} from '../scribble/CircleControl'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'
import {toolsDialog} from './dialog'
export interface PToolsProps {
  readonly desktopSurface?: boolean
  readonly sceneStyle?: PSceneStyle
}
export const PTools = (props: PToolsProps) => {
  return (
    <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
      <PButton
        {...GLASS_ICON_BUTTON}
        pill
        accessibleLabel={m.tools_open()}
        tooltip={m.tools_open()}
        icon={getPomoIconClass('i-tabler-tool', props.sceneStyle)}
        onPress={(element) => {
          if (props.desktopSurface) {
            openDesktopDialog('tools').catch((error: unknown) => {
              console.error('Failed to open the desktop tools dialog.', error)
            })
            return
          }

          toolsDialog.open({trigger: element})
        }}
      />
    </PScribbleCircleControl>
  )
}
