import {text as uiText} from '../features/localization'
import {type ComponentProps, createEffect, createSignal, createUniqueId, Show} from 'solid-js'
import {SPoffoConnectionProfiles} from './SPoffoConnectionProfiles'

export const SPoffoProfileMenu = (props: ComponentProps<typeof SPoffoConnectionProfiles>) => {
  const id = createUniqueId()
  const [open, setOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)
  const [popup, setPopup] = createSignal<HTMLDivElement | null>(null)
  createEffect(() => {
    const element = popup()
    const source = trigger()
    if (element !== null && source !== null) {
      element.showPopover({source})
    }
  })
  const handleToggle = () => setOpen((value) => !value)
  const handleDismiss = (event: ToggleEvent & {currentTarget: HTMLDivElement}) => {
    if (event.newState === 'closed' && event.currentTarget.isConnected) {
      setOpen(false)
    }
  }
  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-label={uiText('위젯 설정 관리')}
        title={uiText('위젯 설정 관리')}
        aria-expanded={open()}
        aria-controls={open() ? id : undefined}
        aria-haspopup="dialog"
        style={{'--wallpaper-anchor': `--${id}`}}
        class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-stone-600
          [anchor-name:var(--wallpaper-anchor)] hover:bg-stone-100
          focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={handleToggle}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5 fill-current">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <Show when={open()}>
        <div
          ref={setPopup}
          id={id}
          role="dialog"
          aria-label={uiText('위젯 설정 관리')}
          popover="auto"
          style={{'--wallpaper-anchor': `--${id}`}}
          class="wallpaper-menu w-64 max-w-[calc(100vw-2rem)] p-3"
          onBeforeToggle={handleDismiss}
        >
          <SPoffoConnectionProfiles {...props} />
        </div>
      </Show>
    </>
  )
}
