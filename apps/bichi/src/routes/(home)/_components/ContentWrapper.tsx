import type {JSX} from 'solid-js'

export interface ContentWrapperProps {
  ref: (el: HTMLElement) => void
  children?: JSX.Element
}

/** Fixed full-viewport content container. Pass ref to sync with scroll stage. */
export function ContentWrapper(props: ContentWrapperProps) {
  return (
    <div
      class="content fixed inset-0 z-10 overflow-hidden bg-transparent"
      ref={props.ref}
    >
      {props.children}
    </div>
  )
}
