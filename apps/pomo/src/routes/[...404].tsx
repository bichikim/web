import {useLocation} from '@solidjs/router'
import {lazy, Show} from 'solid-js'
import {NotFoundContent} from '../components/not-found/Content'

const PageDispatcher = import.meta.env.DEV
  ? lazy(() => import('src/components/dev/PageDispatcher'))
  : undefined

export default function NotFoundPage() {
  const location = useLocation()
  const pathname = () => location.pathname.replace(/\/+$/u, '') || '/'
  const Dispatcher = () =>
    import.meta.env.DEV &&
    (pathname() === '/dev' || pathname().startsWith('/dev/')) &&
    PageDispatcher !== undefined
      ? PageDispatcher
      : undefined

  return (
    <Show keyed fallback={<NotFoundContent />} when={Dispatcher()}>
      {(Dispatcher) => <Dispatcher fallback={<NotFoundContent />} pathname={pathname()} />}
    </Show>
  )
}
