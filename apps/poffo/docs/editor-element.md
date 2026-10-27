# Custom Element 연결

`@winter-love/puppet/editor-element`를 가져오면 `<puppet-editor>`가 등록된다. Poffo는 Solid `editor`를 직접 사용하고, Custom Element는 일반 DOM 호스트용으로 유지한다. [공개 Element 구현](../../../packages/puppet/src/editor-element/PuppetEditorElement.tsx#L1)과 [명령 타입](../../../packages/puppet/src/editor/control.ts#L1)이 계약의 기준이다.

## 호스트 헤더 예

아래 헤더는 호스트 소유다. 요소 연결 전에 상태 이벤트를 구독하고, 이벤트를 놓친 경우에도 `element.state`를 읽는다. 반환된 모드 전환의 완료는 `operation.finished`로 확인할 수 있다.

```ts
import '@winter-love/puppet/editor-element'

const editor = document.createElement('puppet-editor')
const modeling = document.createElement('button')
modeling.textContent = '모델링'
modeling.addEventListener('click', () => {
  editor.control?.commands.selectMode('modeling')
})
const animation = document.createElement('button')
animation.textContent = '애니메이션'
animation.addEventListener('click', () => {
  editor.control?.commands.selectMode('animation')
})
const reflect = () => {
  const state = editor.state.editor
  modeling.disabled = state?.lifecycle !== 'active'
  animation.disabled = state?.lifecycle !== 'active'
  modeling.setAttribute('aria-pressed', String(state?.mode === 'modeling'))
  animation.setAttribute('aria-pressed', String(state?.mode === 'animation'))
}
editor.addEventListener('puppet-state-change', reflect)
document.body.append(modeling, animation, editor)
reflect()
```

패널 버튼은 `commands.togglePanel('left' | 'right' | 'bottom')`으로 연결한다. 메뉴·파일 선택·다운로드 UI는 호스트에서 구현한다. 요소 내부에 예전 서비스 헤더는 포함하지 않는다. 패널 팝오버는 요소의 Shadow DOM 안에 렌더링한다.

## 문서 조회·초기화·교체

- `.document` 대입은 검증·복사 후 문서와 이력을 초기화한다. 동일 문서 재대입도 초기화다. 연결 전에는 보관하고 다음 연결에서 사용한다.
- 잘못된 대입은 예외를 던지지 않으며 이전 문서를 유지한다. `state.error`와 `puppet-state-change`로 알린다.
- `.document`와 `exportDocument()`는 동기 방어적 복사본이다. 트랜잭션 중에도 현재 작업 문서를 조회한다. 반환값을 수정해 편집할 수 없다. 입력값·문서 이벤트 payload도 호스트 문서와 분리한다.
- undo 가능한 교체는 `control.commands.replaceDocument(document)`를 사용한다. 비동기 준비 뒤에는 시작할 때 캡처한 `{sessionId, revision}`을 두 번째 인수로 전달해 오래된 결과를 거절한다. 문서 결과는 `ok`, 에디터 생명주기 거절은 `status: 'rejected'`로 확인한다.
- 최초 아틀라스 입력·초기화는 커밋하지 않지만, 이어지는 이미지 분리 완료는 기존처럼 별도 교체·커밋·undo 한 단계다. 준비 실패는 문서를 보존하고 `document-prepare-failed`를 알린다. 준비 중 기준 변경·해제는 이전 결과를 무효화한다.

## 상태와 이벤트

`element.state`는 연결 전·후 모두 `{editor, error}`를 반환한다. 연결 전·해제 후 `editor`는 `null`, `control`은 `undefined`다. 오류가 없으면 `error`는 `null`이다.

| 이벤트                   | payload·순서                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `puppet-document-change` | 문서 복사본. 초기 연결·명시적 초기화·실제 갱신·롤백             |
| `puppet-document-commit` | 완료된 변경의 문서 복사본과 변경 메타데이터. 초기화 자체는 제외 |
| `puppet-state-change`    | `element.state`와 같은 구조. 연결·모드·패널·이력·오류 상태      |

문서 캐시를 먼저 갱신한 뒤 문서 변경 → 커밋 → 상태 순서로 필요한 이벤트만 발행한다. 트랜잭션 완료 시 문서 내용이 그대로라면 문서 변경 이벤트를 반복하지 않는다. 이벤트는 `bubbles: true`, `composed: true`다. 리스너가 문서를 초기화하거나 요소를 제거·재연결하면 이전 단계의 후속 이벤트를 중단한다.

## 생명주기와 이전 영향

같은 연결에서는 `control.lifecycle.activate/deactivate/suspend/resume`을 사용한다. 문서 교체·undo/redo·화면 비활성화는 진행 중 조작과 충돌하면 `busy`로 거절한다. DOM 제거는 미완료 조작을 시작 문서로 복원하고 자원·구독·전용 플레이어를 해제한다. 완료된 문서는 getter로 조회할 수 있다.

재삽입하면 보관 문서로 새 호스트 이력·controller를 만든다. 이전 제어 객체는 새 요소 상태를 변경하지 않는다. 일반 DOM 이동도 제거·재연결이므로 편집 상태를 유지하려면 같은 연결을 유지한다. Element의 최종 해제는 어댑터 소유이며 `control.lifecycle.dispose`는 공개하지 않는다.

기존 `.document`, `exportDocument()`, 문서 변경 이벤트와 초기화 의미는 유지한다. **문서 참조 동일성, 반환값 직접 수정, 기본 서비스 헤더 UI는 호환 대상에서 제외한다.** 저장소 소비처는 이전했으며 외부 호스트 전체의 호환성을 확인한 것은 아니다. Solid의 이전 `initialDocument` props 대신 `model` 바인딩을 사용한다.
