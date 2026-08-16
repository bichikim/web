interface EditorIdleState {
  readonly message: string
  readonly status: 'idle' | 'ready'
}

interface EditorProgressState {
  readonly message: string
  readonly progress: number
  readonly status: 'preparing'
}

interface EditorBusyState {
  readonly message: string
  readonly status: 'analyzing' | 'generating' | 'loading' | 'saving'
}

interface EditorErrorState {
  readonly message: string
  readonly status: 'error'
}

export type DialogueEditorState =
  | EditorBusyState
  | EditorErrorState
  | EditorIdleState
  | EditorProgressState

export const isDialogueEditorBusy = (state: DialogueEditorState) => {
  switch (state.status) {
    case 'analyzing':
    case 'generating':
    case 'loading':
    case 'preparing':
    case 'saving':
      return true
    case 'error':
    case 'idle':
    case 'ready':
      return false
  }

  state satisfies never
}
