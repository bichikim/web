import {createSignal} from 'solid-js'
import {FileField} from '@kobalte/core/file-field'
import {Button} from '@kobalte/core/button'
interface FileActionProps {
  readonly accept?: string
  readonly label: string
  readonly description?: string
  readonly onImport?: (file: File | undefined) => void
  readonly onClose: () => void
}
export const FileAction = (props: FileActionProps) => {
  const [input, setInput] = createSignal<HTMLInputElement>()
  const handleOpen = () => {
    props.onClose()
    input()?.click()
  }
  const handleChange = (event: Event & {currentTarget: HTMLInputElement}) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    props.onImport?.(file)
  }
  return (
    <>
      <Button
        class="file-menu-action"
        title={props.description}
        type="button"
        disabled={props.onImport === undefined}
        onClick={handleOpen}
      >
        <span>{props.label}</span>
        <small aria-hidden="true">{props.description}</small>
      </Button>
      <FileField
        accept={
          props.accept ?? '.png,.psd,.json,image/png,application/json,image/vnd.adobe.photoshop'
        }
      >
        <FileField.HiddenInput
          ref={setInput}
          aria-label={props.label}
          hidden
          type="file"
          onChange={handleChange}
        />
      </FileField>
    </>
  )
}
