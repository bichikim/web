import {type Accessor, createEffect, createSignal} from 'solid-js'
import {errorMessage} from './error-message'

interface UseWorkspaceSettingsProps {
  /** 설정이 열려 있는지 나타냅니다. 다시 열면 현재 폴더로 입력을 초기화합니다. */
  readonly active: Accessor<boolean>
  /** 현재 연결된 작업 폴더입니다. 연결 전에는 빈 문자열을 반환합니다. */
  readonly workspace: Accessor<string>
  /** 경로를 적용하고 저장합니다. 취소하면 false를 반환하며 실패하면 거부합니다. */
  readonly apply: (path: string) => Promise<boolean>
}

/** 작업 폴더 입력과 적용 상태를 관리하며 실패한 입력은 재시도할 수 있게 유지합니다. */
export const useWorkspaceSettings = (props: UseWorkspaceSettingsProps) => {
  const [path, setPath] = createSignal('')
  const [pending, setPending] = createSignal(false)
  const [feedback, setFeedback] = createSignal<string | null>(null)
  createEffect(() => {
    if (props.active()) {
      setPath(props.workspace())
      setFeedback(null)
    }
  })
  const submit = async (): Promise<void> => {
    const value = path().trim()
    if (pending() || value === '') {
      return
    }
    setPending(true)
    setFeedback(null)
    try {
      await props.apply(value)
    } catch (error) {
      setFeedback(errorMessage(error))
    } finally {
      setPending(false)
    }
  }
  return {change: setPath, feedback, path, pending, submit}
}
