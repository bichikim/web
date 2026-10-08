import {Show} from 'solid-js'

interface SWorkspacePromptProps {
  workspace?: string
}

export const SWorkspacePrompt = (props: SWorkspacePromptProps) => (
  <div class="m-auto max-w-lg px-6 py-8 text-center text-muted">
    <Show
      when={props.workspace}
      fallback={
        <>
          <h2 class="m-0 text-base font-medium text-foreground">파일을 열어 시작하세요</h2>
          <p>
            연결된 작업 폴더가 없습니다. 위에 파일의 절대 경로를 입력하거나 Codex에서 파일을 열어
            주세요.
          </p>
        </>
      }
    >
      {(workspace) => (
        <>
          <h2 class="m-0 break-all text-base font-medium text-foreground">{workspace()}</h2>
          <p>파일 트리에서 파일을 선택하거나 위에서 파일을 검색하세요.</p>
        </>
      )}
    </Show>
  </div>
)
