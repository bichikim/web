import {lazy, Show} from 'solid-js'
import type {EditorAppProps} from './EditorApp'
import {useWorkspaceLocation} from './use-workspace-location'
import {WorkspaceProvider} from './workspace/WorkspaceProvider'
import {WorkspacePages} from './workspace/WorkspacePages'
import {useWorkspaceSession} from './workspace/use-workspace-session'
import type {WorkspaceMode} from './workspace/types'
const ConverterPage = lazy(() =>
  import('./converter/ConverterPage').then((module) => ({default: module.ConverterPage})),
)
export const WorkspaceApp = (props: EditorAppProps) => {
  const current = useWorkspaceLocation()
  const session = useWorkspaceSession({fallback: () => props.session, location: current})
  const pathname = () => (import.meta.env.DEV ? current().pathname : '/editor')
  const mode = (): WorkspaceMode => {
    switch (pathname()) {
      case '/viewer':
      case '/viewer/':
        return 'viewer'
      case '/studio':
      case '/studio/':
        return 'studio'
      default:
        return 'editor'
    }
  }
  return (
    <Show when={!/^\/converter\/?$/u.test(pathname())} fallback={<ConverterPage />}>
      <Show when={session.scope()} keyed>
        <WorkspaceProvider mode={mode()} onRuntimeOpen={session.openRuntime}>
          <WorkspacePages
            {...props}
            session={session.recovery}
            initialMotionId={current().searchParams.get('motion') ?? props.initialMotionId}
          />
        </WorkspaceProvider>
      </Show>
    </Show>
  )
}
