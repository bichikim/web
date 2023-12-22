import {Title} from '@solidjs/meta'
import Counter from 'src/components/Counter'
import {RouteSectionProps} from '@solidjs/router'

export default function MainLayout(props: RouteSectionProps) {
  return (
    <main>
      hello
      {props.children}
    </main>
  )
}
