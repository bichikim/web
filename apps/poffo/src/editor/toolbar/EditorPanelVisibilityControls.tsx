import {type EditorPanelVisibility, EditorToggleButton} from '@winter-love/puppet/editor'

interface EditorPanelVisibilityControlsProps {
  readonly visibility?: EditorPanelVisibility
}

export const EditorPanelVisibilityControls = (props: EditorPanelVisibilityControlsProps) => (
  <div class="panel-visibility-controls" aria-label="편집 패널 표시">
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.leftOpen === false ? '왼쪽 패널 열기' : '왼쪽 패널 닫기'}
      pressed={props.visibility?.leftOpen !== false}
      onClick={() => props.visibility?.onLeftToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar" />
    </EditorToggleButton>
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.rightOpen === false ? '오른쪽 패널 열기' : '오른쪽 패널 닫기'}
      pressed={props.visibility?.rightOpen !== false}
      onClick={() => props.visibility?.onRightToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-sidebar-right" />
    </EditorToggleButton>
    <EditorToggleButton
      size="md"
      aria-label={props.visibility?.bottomOpen === false ? '아래 프레임 열기' : '아래 프레임 닫기'}
      pressed={props.visibility?.bottomOpen !== false}
      onClick={() => props.visibility?.onBottomToggle()}
    >
      <span aria-hidden="true" class="puppet-icon puppet-icon-layout-bottombar" />
    </EditorToggleButton>
  </div>
)
