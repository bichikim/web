import {createSignal, Show, Suspense} from 'solid-js'
import * as m from '@paraglide/message'
import {type BackgroundController} from 'src/features/background'
import {Catalog} from './Catalog'
import {PModal} from '../../PModal'
import {PSettingsActionButton} from '../ActionButton'

export interface SetsProps {
  readonly background: BackgroundController
}
export const Sets = (props: SetsProps) => {
  let trigger: HTMLButtonElement | undefined
  const [open, setOpen] = createSignal(false)
  return (
    <>
      <PSettingsActionButton
        icon="i-tabler-library-photo"
        onPress={(source) => {
          trigger = source
          setOpen(true)
        }}
      >
        {m.background_sets_use()}
      </PSettingsActionButton>
      <Show when={open()}>
        <PModal
          onCloseAutoFocus={() => trigger?.focus()}
          isOpen={open()}
          onOpenChange={setOpen}
          title={m.background_sets_use()}
          description={m.background_sets_description()}
          footer={
            <p class="m-0 text-xs leading-5 text-muted-foreground">
              {m.background_sets_ai_notice()}
            </p>
          }
        >
          <Suspense fallback={<p role="status">{m.background_sets_loading()}</p>}>
            <Catalog background={props.background} onAdded={() => setOpen(false)} />
          </Suspense>
        </PModal>
      </Show>
    </>
  )
}
