import {EditorButton} from '../../design-system'
import {Dialog} from '@kobalte/core/dialog'

interface AutoMeshDialogFooterProps {
  readonly canGenerate: boolean
  readonly isGenerating: boolean
}

export const AutoMeshDialogFooter = (props: AutoMeshDialogFooterProps) => (
  <footer>
    <Dialog.CloseButton aria-label="취소" class="secondary">
      취소
    </Dialog.CloseButton>
    <EditorButton disabled={props.isGenerating || !props.canGenerate} type="submit">
      {props.isGenerating ? '생성 중…' : '자동 메시 생성'}
    </EditorButton>
  </footer>
)
