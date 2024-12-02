import {JSX} from 'solid-js'

export type HPianoBodyProps = JSX.HTMLAttributes<HTMLDivElement>

export const HPianoBody = (props: HPianoBodyProps) => {
  return <div {...props}>{props.children}</div>
}
