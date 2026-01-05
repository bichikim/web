import {RouteSectionProps, RouteDefinition as _RouteDefinition, RouteMatch} from '@solidjs/router'
import {AuthProvider} from 'src/store/auth'
import {HRouterNameProvider} from 'src/components/anchor/HRouterName'
import {AuthGuard, RouteDefinition} from 'src/components/auth-guard'
import {Suspense} from 'solid-js'

const routerName = {
  'change-password': '/auth/change-password',
  home: '/',
  musics: '/musics',
  piano: '/piano',
  'reset-password': '/auth/reset-password',
  'sign-in': '/auth/sign-in',
  'sign-up': '/auth/sign-up',
  'verify-email': '/auth/verify-email',
}

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

export default function MainLayout(props: RouteSectionProps) {
  return (
    <HRouterNameProvider routerName={routerName}>
      <AuthProvider>
        <AuthGuard>{props.children}</AuthGuard>
      </AuthProvider>
    </HRouterNameProvider>
  )
}
