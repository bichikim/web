import {RouteSectionProps, RouteDefinition} from '@solidjs/router'
import {AuthProvider} from 'src/store/auth'

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

export default function MainLayout(props: RouteSectionProps) {
  return <AuthProvider>{props.children}</AuthProvider>
}
