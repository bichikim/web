import type {JSX} from 'solid-js'

export interface ScrollContentProps {
  children?: JSX.Element
}

/** Centered scrollable content area with max width. */
export function ScrollContent(props: ScrollContentProps) {
  return <div class="scroll__content mx-auto max-w-[1500px] text-slate-900">{props.children}</div>
}
