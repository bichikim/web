import {RouteSectionProps, RouteDefinition as _RouteDefinition} from '@solidjs/router'
import {AuthProvider} from 'src/store/auth'
import {HRouterNameProvider} from 'src/components/anchor/HRouterName'
import {AuthGuard, RouteDefinition} from 'src/components/auth-guard'
import {clientOnly} from '@solidjs/start'

const Analytics = clientOnly(() =>
  import('src/components/vercel/Analytics').then((module) => ({default: module.Analytics})),
)

/**
 * Route name mapping for the application.
 * This object maps semantic route names to their actual URL paths.
 * Used by HRouterNameProvider to enable type-safe, named routing throughout the app.
 * Components can use useHRouterName() hook to access these mappings and navigate by name instead of hardcoded paths.
 */
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

/**
 * Solid start route definition
 */
export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

/**
 * Main layout component that wraps all routes under (main-layout).
 * Provides essential context providers and guards for the application.
 */
export default function MainLayout(props: RouteSectionProps) {
  return (
    <HRouterNameProvider routerName={routerName}>
      <AuthProvider>
        <AuthGuard>{props.children}</AuthGuard>
      </AuthProvider>
      <Analytics />
    </HRouterNameProvider>
  )
}
