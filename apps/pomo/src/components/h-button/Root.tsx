import type {JSX} from 'solid-js'

export const HButtonRoot = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props} type={props.type ?? 'button'} />
)
