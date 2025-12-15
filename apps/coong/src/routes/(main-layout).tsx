import {RouteSectionProps} from '@solidjs/router'
import {AuthProvider} from 'src/store/auth'

export default function MainLayout(props: RouteSectionProps) {
  return <AuthProvider>{props.children}</AuthProvider>
}
