import {JSX, Setter} from 'solid-js'

export type HPianoBodyProps = JSX.HTMLAttributes<HTMLDivElement> & {
  ref?: Setter<HTMLElement | null>
}

export const HPianoBody = (props: HPianoBodyProps) => {
  return <div {...props}>{props.children}</div>
}
