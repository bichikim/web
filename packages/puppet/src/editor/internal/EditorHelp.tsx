import {useEditorPortalMount} from './EditorPortalProvider'
import {Portal} from 'solid-js/web'
import {createSignal, createUniqueId} from 'solid-js'

interface EditorHelpProps {
  readonly onOpen?: () => void
}

export const EditorHelp = (props: EditorHelpProps) => {
  const [dialog, setDialog] = createSignal<HTMLDialogElement>()
  const titleId = createUniqueId()
  const portalMount = useEditorPortalMount()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          props.onOpen?.()
          dialog()?.showModal()
        }}
      >
        도움말
      </button>
      <Portal mount={portalMount}>
        <dialog ref={setDialog} aria-labelledby={titleId} class="editor-help">
          <article>
            <header>
              <h1 id={titleId}>Puppet 도움말</h1>
              <button autofocus type="button" onClick={() => dialog()?.close()}>
                닫기
              </button>
            </header>
            <h2>정점 편집</h2>
            <dl>
              <dt>정점 클릭</dt>
              <dd>정점을 선택합니다.</dd>
              <dt>정점 드래그</dt>
              <dd>정점을 선택하고 이동합니다.</dd>
              <dt>빈 곳 클릭</dt>
              <dd>정점 선택을 해제합니다.</dd>
              <dt>빈 곳 더블클릭</dt>
              <dd>정점을 추가하고 새 정점을 선택합니다. 기존 정점 위에서는 추가하지 않습니다.</dd>
              <dt>Backspace 또는 Delete</dt>
              <dd>
                캔버스에 포커스가 있을 때 선택한 정점을 삭제합니다. 입력칸 편집에는 영향을 주지
                않습니다.
              </dd>
            </dl>
            <p>
              정점 추가·삭제는 모델링 모드에서 가능합니다. 편집할 레이어가 표시되어 있고 잠금이
              해제되어 있어야 합니다. 파라미터 형태를 이동하려면 편집할 키폼을 먼저 선택하세요.
            </p>
            <h2>마스크 경계</h2>
            <p>
              캔버스 오른쪽 위 표시 설정의 ‘마스크 경계 표시’로 검정·흰색 경계선을 켜고 끕니다.
              이미지 자체에는 영향을 주지 않습니다.
            </p>
            <h2>실행 취소와 다시 실행</h2>
            <p>
              햄버거 메뉴의 Undo·Redo를 사용하세요. 실행 취소는 ⌘Z / Ctrl+Z, 다시 실행은 ⇧⌘Z /
              Ctrl+Y입니다.
            </p>
            <h2>파일</h2>
            <p>햄버거 메뉴에서 PNG를 불러오거나 Puppet JSON을 가져오고 내보낼 수 있습니다.</p>
          </article>
        </dialog>
      </Portal>
    </>
  )
}
