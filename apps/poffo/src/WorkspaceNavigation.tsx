import {Show} from 'solid-js'
import {navigateWorkspace} from './navigate-workspace'
import {EditorToast} from '@winter-love/puppet/editor'
import {useWorkspaceNavigation} from './workspace/use-workspace-navigation'
import type {WorkspaceMode, WorkspaceNavigationAction} from './workspace/types'
interface WorkspaceNavigationProps {
  /** 현재 표시 중인 화면. 선택 피드백은 전환 완료를 기다리지 않는다. */
  readonly current: WorkspaceMode
  /** 전환에 유지할 쿼리. 생략하면 기존 Editor 링크의 쿼리를 유지한다. */
  readonly search?: string
  /** Editor 문서로 Studio를 연다. signal 중단 시 전환을 취소하며, 생략하면 버튼을 비활성화한다. */
  readonly onStudioOpen?: WorkspaceNavigationAction
  /** Editor 문서로 Viewer를 연다. signal 중단 시 전환을 취소하며, 생략하면 버튼을 비활성화한다. */
  readonly onViewerOpen?: WorkspaceNavigationAction
}
export const WorkspaceNavigation = (props: WorkspaceNavigationProps) => {
  const href = (mode: WorkspaceMode) =>
    `/${mode}${props.search ?? (mode === 'editor' ? location.search : '')}`
  const onNavigate = (mode: WorkspaceMode, signal: AbortSignal) => {
    if (props.current === 'editor') {
      switch (mode) {
        case 'studio':
          return props.onStudioOpen?.(signal)
        case 'viewer':
          return props.onViewerOpen?.(signal)
        case 'editor':
          return
      }
    }
    navigateWorkspace(href(mode))
  }
  const navigation = useWorkspaceNavigation({current: () => props.current, onNavigate})
  const handleNavigation = (mode: WorkspaceMode, event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    navigation.select(mode)
  }
  return (
    <>
      <nav
        class="editor-control editor-segmented-field workspace-navigation"
        data-control-size="md"
        data-size="md"
        data-icons=""
        aria-label="작업 공간 이동"
      >
        <a
          href={href('editor')}
          onClick={[handleNavigation, 'editor']}
          aria-current={props.current === 'editor' ? 'page' : undefined}
          data-selected={navigation.selected() === 'editor' ? '' : undefined}
          aria-label="Editor"
          data-tooltip="Editor"
          title="Editor"
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-workspace-editor" />
          <span class="workspace-navigation-label">Editor</span>
        </a>
        <Show
          when={props.current === 'editor'}
          fallback={
            <>
              <a
                href={href('studio')}
                onClick={[handleNavigation, 'studio']}
                aria-current={props.current === 'studio' ? 'page' : undefined}
                data-selected={navigation.selected() === 'studio' ? '' : undefined}
                aria-label="Studio"
                data-tooltip="Studio"
                title="Studio"
              >
                <span aria-hidden="true" class="puppet-icon puppet-icon-workspace-studio" />
                <span class="workspace-navigation-label">Studio</span>
              </a>
              <a
                href={href('viewer')}
                onClick={[handleNavigation, 'viewer']}
                aria-current={props.current === 'viewer' ? 'page' : undefined}
                data-selected={navigation.selected() === 'viewer' ? '' : undefined}
                aria-label="Viewer"
                data-tooltip="Viewer"
                title="Viewer"
              >
                <span aria-hidden="true" class="puppet-icon puppet-icon-workspace-viewer" />
                <span class="workspace-navigation-label">Viewer</span>
              </a>
            </>
          }
        >
          <button
            type="button"
            disabled={props.onStudioOpen === undefined}
            onClick={() => navigation.select('studio')}
            aria-pressed={navigation.selected() === 'studio'}
            data-selected={navigation.selected() === 'studio' ? '' : undefined}
            aria-label="Studio"
            title="Studio"
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-workspace-studio" />
            <span class="workspace-navigation-label">Studio</span>
          </button>
          <button
            type="button"
            disabled={props.onViewerOpen === undefined}
            onClick={() => navigation.select('viewer')}
            aria-pressed={navigation.selected() === 'viewer'}
            data-selected={navigation.selected() === 'viewer' ? '' : undefined}
            aria-label="Viewer"
            title="Viewer"
          >
            <span aria-hidden="true" class="puppet-icon puppet-icon-workspace-viewer" />
            <span class="workspace-navigation-label">Viewer</span>
          </button>
        </Show>
      </nav>
      <EditorToast message={navigation.error() ?? undefined} onDismiss={navigation.dismissError} />
    </>
  )
}
