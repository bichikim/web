import {Show} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import type {WallpaperLibraryController} from '../features/library'
import {SWebsiteAddress} from './SWebsiteAddress'
import {SWebsiteCustomization} from './SWebsiteCustomization'

interface SWebsiteSettingsProps {
  readonly controller: WallpaperController
  readonly library?: WallpaperLibraryController
}

export const SWebsiteSettings = (props: SWebsiteSettingsProps) => {
  const website = () => {
    const content = props.controller.current()?.content
    return content?.mode === 'website' ? content : undefined
  }
  const url = () => website()?.url ?? ''
  const visit = async (value: string) => {
    const monitorId = props.controller.selectedId()
    const address = value.trim()
    const content = props.controller.current()?.content
    await props.controller.setContent({
      ...(content?.mode === 'website' ? content : {}),
      mode: 'website',
      url: address === '' ? null : address,
    })
    if (address !== '' && monitorId !== null && props.controller.error() === null) {
      await props.library?.visit(monitorId, address)
    }
  }
  return (
    <div class="grid min-w-0 gap-3">
      <SWebsiteAddress
        value={url()}
        history={props.library?.history()}
        onChange={visit}
        onRemove={props.library?.removeVisit}
      />
      <Show when={website()}>
        {(content) => (
          <SWebsiteCustomization
            content={content()}
            monitorId={props.controller.selectedId() ?? undefined}
            busy={props.controller.busy()}
            onApply={props.controller.setContent}
          />
        )}
      </Show>
    </div>
  )
}
