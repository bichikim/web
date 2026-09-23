import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {EditorButton} from '../../design-system'

interface TemporaryFormButtonProps {
  readonly nodeId?: string
  readonly selected?: boolean
  readonly showing?: boolean
  readonly onPreview: (preview: boolean) => void
  readonly onRemove: () => void
  readonly onSave: () => boolean
}

export const TemporaryFormButton = (props: TemporaryFormButtonProps) => {
  const [removing, setRemoving] = createSignal(false)
  const [error, setError] = createSignal(false)
  let root: HTMLDivElement | undefined
  let dialog: HTMLDialogElement | undefined
  let trigger: HTMLButtonElement | undefined
  createEffect(() => {
    if (!removing() || root === undefined) {
      return
    }
    const document = root.ownerDocument
    const dismiss = (event: PointerEvent) => {
      if (root !== undefined && !event.composedPath().includes(root)) {
        setRemoving(false)
      }
    }
    document.addEventListener('pointerdown', dismiss, true)
    onCleanup(() => document.removeEventListener('pointerdown', dismiss, true))
  })
  onCleanup(() => props.onPreview(false))
  return (
    <div
      class="temporary-form"
      ref={(element) => {
        root = element
      }}
      data-node-id={props.nodeId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setRemoving(false)
          props.onPreview(false)
        }
      }}
    >
      <EditorButton
        ref={(element) => {
          trigger = element
        }}
        class="temporary-form-trigger"
        data-pending={props.selected === true}
        aria-label={removing() ? '진짜 삭제?' : '임시 변경'}
        title={
          props.selected
            ? '선택한 키폼에 임시 변경 저장'
            : '키폼을 선택하면 임시 변경을 저장할 수 있습니다'
        }
        onMouseEnter={() => !removing() && props.onPreview(true)}
        onMouseLeave={() => props.onPreview(false)}
        onFocus={() => !removing() && props.onPreview(true)}
        onBlur={() => props.onPreview(false)}
        onClick={() => {
          if (removing()) {
            props.onRemove()
            return
          }
          if (props.selected) {
            props.onPreview(false)
            setError(false)
            dialog?.showModal()
          }
        }}
      >
        <Show when={props.selected && !removing()}>
          <span aria-hidden="true">! </span>
        </Show>
        {removing() ? '진짜 삭제?' : '임시 변경'}
      </EditorButton>
      <Show when={!removing()}>
        <EditorButton
          aria-label="임시 변경 삭제"
          onClick={() => {
            props.onPreview(false)
            setRemoving(true)
          }}
        >
          ×
        </EditorButton>
      </Show>
      <dialog
        class="temporary-form-dialog"
        ref={(element) => {
          dialog = element
        }}
        aria-label="임시 변경 저장 확인"
        onClose={() => trigger?.focus()}
      >
        <p>선택한 키폼에 임시 변경 사항을 저장하시겠습니까?</p>
        <Show when={error()}>
          <p role="alert">레이어 또는 키폼이 변경되어 저장할 수 없습니다.</p>
        </Show>
        <div>
          <EditorButton onClick={() => dialog?.close()}>취소</EditorButton>
          <EditorButton
            onClick={() => {
              if (props.onSave()) {
                dialog?.close()
              } else {
                setError(true)
              }
            }}
          >
            저장
          </EditorButton>
        </div>
      </dialog>
    </div>
  )
}
