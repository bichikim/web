import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'

import type {PSceneStyle} from '../../features/focus-room-animation'
import {openDesktopDialog} from '../../features/desktop-mode/dialogs'
import {getPomoIconClass} from '../icon-style'
import {GLASS_ICON_BUTTON} from '../button-presets'
import {DesktopDialogFrame} from '../desktop-dialog/Frame'
import {FeatureRequestContent} from '../feature-requests/FeatureRequestContent'
import {PButton} from '../p-button/PButton'
import {PModal} from '../p-modal/PModal'
import {PScribbleCircleControl} from '../scribble/CircleControl'

export interface PFeatureRequestProps {
  readonly desktopDialog?: boolean
  readonly desktopSurface?: boolean
  readonly onRequestClose?: () => void
  readonly sceneStyle?: PSceneStyle
}

export const PFeatureRequest = (props: PFeatureRequestProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)

  const handleOpen = (source: HTMLButtonElement) => {
    setTriggerElement(source)

    if (props.desktopSurface) {
      openDesktopDialog('featureRequests').catch((error: unknown) => {
        console.error('Failed to open the desktop feature requests dialog.', error)
      })
      return
    }

    setIsOpen(true)
  }

  return (
    <Show
      fallback={
        <>
          <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
            <PButton
              {...GLASS_ICON_BUTTON}
              pill
              accessibleLabel={m.feature_request_open()}
              icon={getPomoIconClass('i-tabler-message-plus', props.sceneStyle)}
              onPress={handleOpen}
              tooltip={m.feature_request_open()}
            />
          </PScribbleCircleControl>
          <PModal
            description={m.feature_request_description()}
            isOpen={isOpen()}
            onCloseAutoFocus={() => triggerElement()?.focus()}
            onOpenChange={setIsOpen}
            placement="top"
            size="wide"
            title={m.feature_request_title()}
          >
            <Show when={isOpen()}>
              <FeatureRequestContent />
            </Show>
          </PModal>
        </>
      }
      when={props.desktopDialog}
    >
      <DesktopDialogFrame
        onClose={() => props.onRequestClose?.()}
        title={m.feature_request_title()}
      >
        <FeatureRequestContent />
      </DesktopDialogFrame>
    </Show>
  )
}
