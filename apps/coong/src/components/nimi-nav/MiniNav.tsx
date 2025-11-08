import {NavList} from './NavList'

export interface MiniNavProps {
  class?: string
  isHidden?: boolean
}

export const MiniNav = (props: MiniNavProps) => {
  return (
    <nav class={props.class}>
      <NavList />
    </nav>
  )
}
