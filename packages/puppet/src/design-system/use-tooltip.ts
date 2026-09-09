import {connectTooltipTarget, readTooltipLabel} from './tooltip-target'
import {createSignal, createUniqueId, onCleanup, onMount} from 'solid-js'

const OPEN_DELAY = 400
const CLOSE_DELAY = 150

export const useTooltip = () => {
  const id = `editor-tooltip-${createUniqueId()}`
  const anchor = `--${id}`
  const [text, setText] = createSignal('')
  const [side, setSide] = createSignal('top')
  const [arrow, setArrow] = createSignal(0)
  const [surface, setSurface] = createSignal<HTMLDivElement>()
  onMount(() => {
    const content = surface()!
    const tree = content.getRootNode()
    // Portal triggers are siblings of the editor in its shadow root.
    const scope = tree instanceof ShadowRoot ? tree : content.parentElement!
    const document = content.ownerDocument
    const supported =
      typeof content.showPopover === 'function' &&
      typeof CSS !== 'undefined' &&
      CSS.supports('anchor-name', '--tooltip') &&
      CSS.supports('position-area', 'top') &&
      CSS.supports('position-try-fallbacks', 'flip-block')
    let target: HTMLElement | undefined
    let pending: HTMLElement | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let restore: (() => void) | undefined
    const cancel = () => {
      clearTimeout(timer)
      timer = undefined
    }
    const close = () => {
      cancel()
      pending = undefined
      if (supported && text().length > 0) {
        content.hidePopover()
      }
      restore?.()
      restore = undefined
      target = undefined
      setText('')
    }
    const find = (event: Event) =>
      event
        .composedPath()
        .find(
          (entry): entry is HTMLElement =>
            entry instanceof HTMLElement &&
            entry !== content &&
            entry.matches(
              'button[aria-label], [role="button"][aria-label], [data-tooltip], [title]',
            ) &&
            !entry.matches(':disabled, [disabled], [aria-disabled="true"]') &&
            readTooltipLabel(entry).length > 0,
        )
    const open = (element: HTMLElement) => {
      close()
      if (!element.isConnected) {
        return
      }
      target = element
      const value = readTooltipLabel(element)
      restore = connectTooltipTarget({element, anchor, id, supported})
      if (!supported) {
        return
      }
      setText(value)
      content.showPopover()
      const bounds = content.getBoundingClientRect()
      const trigger = element.getBoundingClientRect()
      setSide(bounds.top >= trigger.bottom ? 'bottom' : 'top')
      setArrow(trigger.left + trigger.width / 2 - bounds.left)
    }
    const over = (event: Event) => {
      if ('pointerType' in event && event.pointerType === 'touch') {
        return
      }
      if (event.composedPath().includes(content)) {
        cancel()
        return
      }
      const element = find(event)
      if (element === undefined || element === target || element === pending) {
        return
      }
      close()
      pending = element
      timer = setTimeout(() => open(element), OPEN_DELAY)
    }
    const leave = (event: Event) => {
      if (target?.matches(':focus-visible')) {
        return
      }
      const next = (event as MouseEvent).relatedTarget
      if (
        next instanceof Node &&
        (target?.contains(next) || pending?.contains(next) || content.contains(next))
      ) {
        return
      }
      cancel()
      pending = undefined
      timer = setTimeout(close, CLOSE_DELAY)
    }
    const focus = (event: Event) => {
      const element = find(event)
      if (element?.matches(':focus-visible')) {
        open(element)
      }
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    scope.addEventListener('pointerover', over)
    scope.addEventListener('pointerout', leave)
    scope.addEventListener('focusin', focus)
    scope.addEventListener('focusout', close)
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('keydown', key, true)
    document.addEventListener('scroll', close, true)
    document.defaultView?.addEventListener('resize', close)
    document.defaultView?.addEventListener('blur', close)
    const observer = new MutationObserver(() => {
      if (target !== undefined && !target.isConnected) {
        close()
      }
    })
    observer.observe(scope, {childList: true, subtree: true})
    onCleanup(() => {
      close()
      observer.disconnect()
      scope.removeEventListener('pointerover', over)
      scope.removeEventListener('pointerout', leave)
      scope.removeEventListener('focusin', focus)
      scope.removeEventListener('focusout', close)
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('scroll', close, true)
      document.defaultView?.removeEventListener('resize', close)
      document.defaultView?.removeEventListener('blur', close)
    })
  })
  return {id, anchor, text, side, arrow, setSurface}
}
