import {EditorPanelLayout} from '@winter-love/puppet/editor'
import {HeaderSurface} from '../workspace/HeaderSurface'

interface EditorLoadingProps {
  /** Initial local mode shown by the disabled frame; omitted for modeling. */
  readonly mode?: 'animation' | 'modeling'
}

/** Preserves the loading frame without creating a second model, history, or player. */
export const EditorLoading = (props: EditorLoadingProps) => (
  <section class="document-loading" aria-label="문서 준비 중" aria-busy="true">
    <div inert>
      <EditorPanelLayout
        inactive
        toolbar={() => (
          <HeaderSurface
            owner="editor"
            menu={
              <button type="button" class="toolbar-menu-trigger" aria-label="메인 메뉴" disabled>
                <span aria-hidden="true" class="puppet-icon puppet-icon-menu" />
              </button>
            }
          >
            <span>{props.mode === 'animation' ? '애니메이션' : '모델링'}</span>
          </HeaderSurface>
        )}
        layers={
          <aside class="panel layers-panel" aria-label="Layers">
            <h2>Layers</h2>
          </aside>
        }
        inspector={<aside class="panel inspector-panel" aria-label="선택 작업" />}
        viewport={<section class="viewport" aria-label="모델 보기" />}
        bottom={<section class={props.mode === 'animation' ? 'timeline' : 'modeling-panel'} />}
      />
    </div>
    <span role="status">문서 불러오는 중…</span>
  </section>
)
