import {RouteSectionProps} from '@solidjs/router'

export default function MainLayout(props: RouteSectionProps) {
  return (
    <main>
      hello?
      {props.children}
    </main>
  )
}
