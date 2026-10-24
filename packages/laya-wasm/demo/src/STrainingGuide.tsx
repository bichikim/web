export const STrainingGuide = () => (
  <details open class="mb-5 text-xs leading-relaxed text-slate-600">
    <summary class="cursor-pointer font-600 text-slate-800">학습 방법</summary>
    <p class="mb-0 mt-2">
      예제 추가는 문장·선택지·정답을 저장하는 단계입니다. <strong>학습하고 결과 비교</strong>를
      눌러야 모델이 학습합니다.
    </p>
    <ol class="mb-0 mt-2 space-y-2 pl-5">
      <li>
        위에 분류할 문장과 선택지를 입력하고, 아래에서 실제 정답을 골라 <strong>예제 추가</strong>를
        누르세요. 여러 문장은 <strong>JSONL 가져오기</strong>로 한꺼번에 추가할 수 있습니다.
      </li>
      <li>
        은행 문의 실험은 <strong>한글 학습 90개</strong>를 내려받아 가져오세요. 다국어 모델을
        불러오고 <strong>한국어 90개 실험 설정</strong>을 누르면 학습률 0.1·100회가 적용됩니다.
      </li>
      <li>
        정확도 평가에서 <strong>새 평가 30개 불러오기</strong>를 누른 뒤{' '}
        <strong>학습하고 결과 비교</strong>를 실행하세요. 평가 문장은 학습 목록에 넣지 마세요.
      </li>
      <li>
        다시 실행하면 이어서 학습합니다. 설정별로 비교하려면 먼저 <strong>초기 가중치 복원</strong>
        을 누르세요.
      </li>
    </ol>
  </details>
)
