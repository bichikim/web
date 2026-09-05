import {useEditorPortalMount} from './EditorPortalProvider'
import {Dialog} from '@kobalte/core/dialog'

interface EditorHelpProps {
  readonly onOpen?: () => void
}

export const EditorHelp = (props: EditorHelpProps) => {
  const portalMount = useEditorPortalMount()

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          props.onOpen?.()
        }
      }}
    >
      <Dialog.Trigger>도움말</Dialog.Trigger>
      <Dialog.Portal mount={portalMount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content class="editor-help">
          <article>
            <header>
              <Dialog.Title as="h1">Puppet 도움말</Dialog.Title>
              <Dialog.CloseButton>닫기</Dialog.CloseButton>
            </header>
            <h2>레이어 선택과 그룹</h2>
            <p>⌘ 또는 Ctrl을 누르고 여러 레이어를 선택해 그룹으로 묶을 수 있습니다.</p>
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
            <h2>디포머 편집 모드</h2>
            <p>
              기준 배치는 현재 메시 모양을 유지하며 제어점 위치를 바꿉니다. 변형 편집은 제어점을
              움직여 메시를 변형합니다. 자유 변형·곡선·본·핀 디포머에 공통으로 적용됩니다. 기준
              배치는 파라미터 연결 전에 편집하세요.
            </p>
            <h2>곡선 디포머</h2>
            <p>
              곡선 위를 더블클릭하면 기존 모양을 유지하며 연결점을 추가합니다. 캔버스에서 내부
              연결점을 선택하고 Backspace 또는 Delete를 누르면 삭제합니다. 양 끝점은 삭제할 수
              없습니다.
            </p>
            <p>
              연결점을 삭제하면 곡선 모양이 달라질 수 있습니다. 실행 취소로 복원할 수 있으며, 입력칸
              편집에는 영향을 주지 않습니다.
            </p>
            <h2>본 디포머</h2>
            <p>
              레이어를 그룹으로 묶고 그룹 아이콘에서 본 디포머로 변경하세요. 기준 배치에서 관절을
              배치하고 빈 곳을 더블클릭하면 끝에 관절을 추가합니다. 본 선을 더블클릭하면 선 위에
              중간 관절을 삽입합니다. 선택한 관절은 Delete 또는 Backspace로 삭제합니다.
            </p>
            <p>
              변형 편집에서는 본 길이를 유지하며 회전하고 뒤쪽 본이 함께 움직입니다. 첫 관절은
              전체를 이동합니다. 관절 선택 후 방향키로도 조작할 수 있습니다.
            </p>
            <p>
              영향도는 기준 배치의 본과의 거리로 자동 계산합니다. 기준 배치를 수정해도 현재 메시
              모양은 유지됩니다. 파라미터 연결 후에는 기준 배치 편집이 잠기며, 선택한 키폼에 포즈를
              저장합니다.
            </p>
            <p>
              변형 편집에서 ‘끝 관절 IK’를 켜면 끝 관절을 끌 때 앞쪽 관절들이 함께 따라옵니다.
              시작점과 본 길이를 유지하며, 도달할 수 없는 곳은 가능한 거리까지 뻗습니다. 결과는
              선택한 키폼에 저장됩니다.
            </p>
            <h2>핀 디포머</h2>
            <p>
              그룹 아이콘에서 핀 디포머로 변경하세요. 기준 배치에서 빈 곳을 더블클릭해 핀을
              추가하고, 선택한 핀은 Delete 또는 Backspace로 삭제합니다. 마지막 핀은 삭제할 수
              없습니다. 변형 편집에서는 핀을 끌어 반경 안의 정점을 움직입니다. 영향 반경과 강도는
              핀별로 설정하며, 파라미터 연결 전에 편집하세요.
            </p>
            <h2>마스크 적용 대상</h2>
            <p>
              마스크로 사용할 파트를 선택한 뒤 ‘대상 추가’ 또는 ‘레이어에서 선택’으로 적용할
              레이어를 고르세요. 대상 옆 × 버튼은 해당 연결만 해제합니다. 마스크 반전과 ‘이 파트도
              표시’는 선택한 마스크 파트의 설정입니다.
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
