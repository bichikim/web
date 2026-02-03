import type {JSX} from 'solid-js'

export interface IconLinkProps {
  href: string
  ariaLabel: string
  /** External link: open in new tab with noopener noreferrer. */
  external?: boolean
  children?: JSX.Element
  class?: string
}

/** Single link with icon. Use for contact/social links. */
export function IconLink(props: IconLinkProps) {
  const linkClass = () =>
    (props.class ?? '') + ' text-slate-900 opacity-90 transition hover:opacity-100'
  return (
    <a
      href={props.href}
      target={props.external ? '_blank' : undefined}
      rel={props.external ? 'noopener noreferrer' : undefined}
      class={linkClass()}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </a>
  )
}
