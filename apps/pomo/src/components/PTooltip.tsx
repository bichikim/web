import {createEffect, createMemo, createUniqueId, on, onCleanup, untrack} from 'solid-js'
import {useTooltip} from './tooltip/context'

export interface PTooltipProps {
  readonly target?: HTMLElement
  readonly show?: boolean
  readonly text?: string
}

export const PTooltip = (props: PTooltipProps) => {
  const tooltip = useTooltip()
  const owner = createUniqueId()
  const hasText = createMemo(() => (props.text?.trim().length ?? 0) > 0)
  createEffect(
    on(
      () => props.target,
      () => {
        onCleanup(() => tooltip?.dismiss(owner, true))
      },
    ),
  )
  createEffect(() => {
    // oxlint-disable-next-line eslint/prefer-destructuring -- Track the target without destructuring Solid props.
    const target = props.target
    // oxlint-disable-next-line eslint/prefer-destructuring -- Track visibility without destructuring Solid props.
    const show = props.show
    const supported = tooltip?.supported()
    if (target === undefined || tooltip === undefined) {
      return
    }
    if (!hasText()) {
      untrack(() => tooltip.dismiss(owner, true))
      return
    }
    if (supported === false) {
      if (!show) {
        return
      }
      const previous = target.getAttribute('title')
      target.setAttribute('title', props.text ?? '')
      onCleanup(() => {
        if (previous === null) {
          target.removeAttribute('title')
        } else {
          target.setAttribute('title', previous)
        }
      })
      return
    }
    untrack(() => {
      if (show) {
        tooltip.present({owner, target, text: () => props.text ?? ''})
      } else {
        tooltip.dismiss(owner)
      }
    })
  })
  onCleanup(() => tooltip?.dismiss(owner, true))
  return null
}
