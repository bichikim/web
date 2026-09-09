import {createSignal, ErrorBoundary, lazy, Suspense} from 'solid-js'
import * as m from '@paraglide/message'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {PButton} from './PButton'
import {PModal} from './PModal'
import {PLoadingStatus} from './PLoadingStatus'
import {GLASS_ICON_BUTTON} from './button-presets'
import {getPomoIconClass} from './icon-style'
import {PScribbleCircleControl} from './scribble/CircleControl'
const Content = lazy(() => import('./tools/Content').then((module) => ({default: module.Content})))
export interface PToolsProps {
  readonly sceneStyle?: PSceneStyle
}
export const PTools = (props: PToolsProps) => {
  const [open, setOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  return (
    <>
      <PScribbleCircleControl enabled={props.sceneStyle === 'scribble'}>
        <PButton
          {...GLASS_ICON_BUTTON}
          pill
          accessibleLabel={m.tools_open()}
          tooltip={m.tools_open()}
          icon={getPomoIconClass('i-tabler-tool', props.sceneStyle)}
          onPress={(element) => {
            setTrigger(element)
            setOpen(true)
          }}
        />
      </PScribbleCircleControl>
      <PModal
        isOpen={open()}
        onOpenChange={setOpen}
        onCloseAutoFocus={() => trigger()?.focus()}
        title={m.tools_open()}
        description={m.tools_description()}
        placement="top"
        size="expanded"
      >
        <ErrorBoundary fallback={<p role="alert">{m.modal_content_load_error()}</p>}>
          <Suspense fallback={<PLoadingStatus message={m.modal_content_loading()} />}>
            <Content />
          </Suspense>
        </ErrorBoundary>
      </PModal>
    </>
  )
}
