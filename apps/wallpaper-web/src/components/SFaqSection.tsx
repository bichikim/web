import {For} from 'solid-js'
import {SIcon} from './SIcon'

const QUESTIONS = [
  {
    answer:
      '배경화면은 바탕화면을 앨범, Poffo 캐릭터, 웹사이트로 채워요. 위젯은 다른 앱 위에도 표시되는 독립된 Poffo 캐릭터예요. 두 기능은 함께 쓰거나 각각 사용할 수 있어요.',
    question: '배경화면과 위젯은 어떻게 다른가요?',
  },
  {
    answer:
      '앨범에는 내 기기의 사진과 동영상을 추가할 수 있어요. 캐릭터 배경과 위젯에는 Poffo 파일을 가져와 사용해요. 위의 흰 고양이는 예시 캐릭터이며 앱 기본 제공 캐릭터가 아니에요.',
    question: '어떤 사진과 캐릭터를 사용할 수 있나요?',
  },
  {
    answer: String(
      '배경화면과 캐릭터 위젯은 Codex 연결 없이 사용할 수 있어요. ' +
        'Codex와 연결하면 작업 상태와 응답을 캐릭터 옆 말풍선으로 확인할 수 있어요. ',
    ),
    question: 'Codex가 있어야 사용할 수 있나요?',
  },
  {
    answer:
      '네. 모니터마다 배경 종류와 콘텐츠를 따로 지정할 수 있어요. 각 화면에 어울리는 사진, 동영상, Poffo 캐릭터, 웹사이트를 선택하세요.',
    question: '모니터마다 다른 배경을 설정할 수 있나요?',
  },
] as const

export const SFaqSection = () => (
  <section
    id="faq"
    aria-labelledby="faq-heading"
    class="page-width grid gap-8 pt-20 pb-24 md:grid-cols-[0.65fr_1.35fr] md:gap-18 sm:pb-32"
  >
    <div>
      <p class="section-label">FAQ</p>
      <h2 id="faq-heading" class="mt-4 text-8 font-650 tracking-tight">
        자주 묻는 질문
      </h2>
    </div>
    <div class="border-0 border-t border-solid border-ink/15">
      <For each={QUESTIONS}>
        {(item) => (
          <details class="group border-0 border-b border-solid border-ink/15 py-5">
            <summary
              class="flex min-h-8 list-none items-center justify-between gap-5 text-sm font-600
              [&::-webkit-details-marker]:hidden"
            >
              {item.question}
              <SIcon name="plus" class="h-6 w-6 shrink-0 transition group-open:rotate-45" />
            </summary>
            <p class="body-copy pb-1 pt-4 text-sm!">{item.answer}</p>
          </details>
        )}
      </For>
    </div>
  </section>
)
