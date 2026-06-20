import {RouteDefinition as _RouteDefinition, RouteSectionProps} from '@solidjs/router'
import {AuthProvider} from 'src/store/auth'
import {AuthGuard} from 'src/components/auth-guard'
import {clientOnly} from '@solidjs/start'
import {RouteMeta} from 'src/components/page-meta'

const Analytics = clientOnly(() =>
  import('src/components/vercel/Analytics').then((module) => ({default: module.Analytics})),
)
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
    <>
      <RouteMeta />
      <AuthProvider>
        <AuthGuard>{props.children}</AuthGuard>
      </AuthProvider>
      <Analytics />
    </>
  )
}
