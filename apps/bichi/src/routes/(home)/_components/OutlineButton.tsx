import type {JSX} from 'solid-js'

const outlineButtonClass =
  'section__button inline-block w-fit rounded-full border-2 border-slate-900 px-6 py-3 font-medium transition hover:bg-slate-900 hover:text-white hover:border-slate-900'

export interface OutlineButtonProps {
  href: string
  /** Open in new tab with noopener noreferrer. */
  external?: boolean
  children?: JSX.Element
  class?: string
}

/** Pill-shaped outline link button. */
export function OutlineButton(props: OutlineButtonProps) {
  const className = () => (props.class ? `${outlineButtonClass} ${props.class}` : outlineButtonClass)
  return (
    <a
      href={props.href}
      target={props.external ? '_blank' : undefined}
      rel={props.external ? 'noopener noreferrer' : undefined}
      class={className()}
    >
      {props.children}
    </a>
  )
}
