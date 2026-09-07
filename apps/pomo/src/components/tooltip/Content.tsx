import {createEffect, createSignal, createUniqueId, onCleanup, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useTooltip} from './context'
import {TOOLTIP_SURFACE_CLASSES} from './surface'
import {cx} from 'class-variance-authority'

export const PTooltipContent = () => {
  const tooltip = useTooltip()
  const id = `pomo-tooltip-${createUniqueId()}`
  const anchor = `--${id}`
  const [element, setElement] = createSignal<HTMLDivElement>()
  const [side, setSide] = createSignal<'top' | 'bottom'>('top')
  const [arrowOffset, setArrowOffset] = createSignal(0)
  const close = () => tooltip?.close()
  createEffect(() => {
    const request = tooltip?.active()
    const content = element()
    if (request === undefined || content === undefined) {
      return
    }
    const {target} = request
    const description = target.getAttribute('aria-describedby')
    const previousAnchor = target.style.getPropertyValue('--pomo-tooltip-anchor')
    const previousTrigger = target.getAttribute('data-pomo-tooltip-trigger')
    target.setAttribute('aria-describedby', [description, id].filter(Boolean).join(' '))
    target.setAttribute('data-pomo-tooltip-trigger', '')
    target.style.setProperty('--pomo-tooltip-anchor', anchor)
    content.showPopover()
    const targetBounds = target.getBoundingClientRect()
    const contentBounds = content.getBoundingClientRect()
    setSide(contentBounds.top >= targetBounds.bottom ? 'bottom' : 'top')
    setArrowOffset(targetBounds.left + targetBounds.width / 2 - contentBounds.left)
    const document = target.ownerDocument
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('click', close, true)
    document.addEventListener('scroll', close, true)
    document.defaultView?.addEventListener('blur', close)
    document.defaultView?.addEventListener('resize', close)
    onCleanup(() => {
      if (content.isConnected) {
        content.hidePopover()
      }
      if (description === null) {
        target.removeAttribute('aria-describedby')
      } else {
        target.setAttribute('aria-describedby', description)
      }
      if (previousTrigger === null) {
        target.removeAttribute('data-pomo-tooltip-trigger')
      } else {
        target.setAttribute('data-pomo-tooltip-trigger', previousTrigger)
      }
      if (previousAnchor === '') {
        target.style.removeProperty('--pomo-tooltip-anchor')
      } else {
        target.style.setProperty('--pomo-tooltip-anchor', previousAnchor)
      }
      document.removeEventListener('keydown', handleKey, true)
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('click', close, true)
      document.removeEventListener('scroll', close, true)
      document.defaultView?.removeEventListener('blur', close)
      document.defaultView?.removeEventListener('resize', close)
    })
  })
  return (
    <Show when={tooltip?.supported()}>
      <Portal>
        <div
          ref={setElement}
          id={id}
          role="tooltip"
          popover="manual"
          hidden={tooltip?.active() === undefined}
          data-pomo-tooltip-content=""
          data-side={side()}
          class={cx(
            TOOLTIP_SURFACE_CLASSES,
            'fixed inset-auto overflow-visible m-2 w-max max-w-[min(20rem,calc(100vw_-_1rem))] box-border',
            '[position-anchor:var(--pomo-tooltip-anchor)] [position-area:top]',
            '[position-try-fallbacks:flip-block,top_span-right,top_span-left,bottom_span-right,bottom_span-left]',
            '[position-visibility:anchors-visible] [overflow-wrap:anywhere] [&[hidden]]:hidden',
          )}
          style={{'--pomo-tooltip-anchor': anchor, '--pomo-tooltip-arrow-x': `${arrowOffset()}px`}}
          onPointerEnter={() => tooltip?.cancelClose()}
          onPointerLeave={() => tooltip?.scheduleClose()}
        >
          <span
            aria-hidden="true"
            data-pomo-tooltip-arrow=""
            data-side={side()}
            class={
              'pointer-events-none absolute size-2 rotate-45 bg-modal-surface border-solid border-border ' +
              'border-0 -translate-x-1/2 [left:clamp(0.5rem,var(--pomo-tooltip-arrow-x),calc(100%_-_0.5rem))] ' +
              'data-[side=bottom]:top-[-5px] data-[side=bottom]:border-l data-[side=bottom]:border-t ' +
              'data-[side=top]:bottom-[-5px] data-[side=top]:border-r data-[side=top]:border-b'
            }
          />
          {tooltip?.active()?.text()}
        </div>
      </Portal>
    </Show>
  )
}
