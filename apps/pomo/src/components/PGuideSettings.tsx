import {Tabs} from '@kobalte/core/tabs'
import {For} from 'solid-js'

import {POMODORO_TIMER_CONFIG} from '../features/pomodoro-timer'

const SECONDS_PER_MINUTE = 60
const minutes = (seconds: number) => seconds / SECONDS_PER_MINUTE
const POMODORO_CYCLE_GUIDE = [
  `기본 한 주기는 집중 ${minutes(POMODORO_TIMER_CONFIG.focusSeconds)}분과 `,
  `짧은 휴식 ${minutes(POMODORO_TIMER_CONFIG.shortBreakSeconds)}분을 반복하고, `,
  `집중 ${POMODORO_TIMER_CONFIG.focusSessionsPerCycle}회를 마치면 `,
  `긴 휴식 ${minutes(POMODORO_TIMER_CONFIG.longBreakSeconds)}분으로 이어져요.`,
].join('')

const GUIDE_SECTIONS = [
  {
    details: [
      '포모와 시작하기를 누르면 장면과 도구가 열려요.',
      '왼쪽 위에는 포모도로, 오른쪽 위에는 장면과 설정, 왼쪽 아래에는 음악과 대화가 있어요.',
    ],
    title: '시작하기',
  },
  {
    details: [
      '낮·밤을 직접 고르거나 현재 시각에 맞추는 자동 모드를 사용할 수 있어요.',
      '책 읽기·글쓰기·노트북 타이핑과 핀의 시선을 바꿀 수 있어요.',
      '3D 깊이 또는 좌우 보기로 움직임을 고르고, 드래그나 지원 기기의 자이로스코프로 조작해요.',
    ],
    title: '장면',
  },
  {
    details: [
      POMODORO_CYCLE_GUIDE,
      '핀 얼굴을 누르면 바로 시작하거나 일시정지하고, 시간 표시를 누르면 전체 조작을 열어요.',
      '다음 단계 이동, 현재 세션 종료, 집중 횟수 초기화, 자동 재생과 시간 변경을 사용할 수 있어요.',
    ],
    title: '포모도로',
  },
  {
    details: [
      '재생·일시정지, 이전·다음 곡, 탐색과 음량을 조절할 수 있어요.',
      '펼친 화면에서는 전체 반복·한 곡 반복·셔플과 재생 목록을 사용할 수 있어요.',
    ],
    title: '음악',
  },
  {
    details: [
      '대화 탭에서 대화를 만들고 듣고 편집하거나 삭제하고, 음성 모델과 목소리를 고를 수 있어요.',
      '이벤트 탭에서는 Pomo 시작, 집중 시작·종료, 휴식 시작·종료에 재생할 대화를 연결해요.',
    ],
    title: '대화와 이벤트',
  },
  {
    details: [
      '피드 탭에서 RSS·Atom 주소나 추천 피드를 추가하고 음성을 선택해요.',
      '새 글을 확인해 대화로 준비하는 상태와 해결이 필요한 문제는 화면에서 알려 줘요.',
    ],
    title: '피드',
  },
  {
    details: [
      '지원되는 환경에서는 집중하는 동안 화면이 자동으로 꺼지지 않게 할 수 있어요.',
      '스크린 세이버 시간을 정하면 조작이 없을 때 화면을 검게 가리고, 터치·클릭·키 입력으로 돌아와요.',
      '일반 탭에서 장면과 움직임, 화면 유지와 스크린 세이버를 관리해요.',
    ],
    title: '설정과 화면',
  },
] as const

export const PGuideSettings = () => (
  <Tabs.Content value="guide">
    <section aria-labelledby="pomo-guide-title" class="grid gap-6">
      <header>
        <p class="m-0 text-xs font-750 tracking-[0.18em] text-highlight uppercase">Pomo guide</p>
        <h2 class="mb-0 mt-2 text-2xl font-800 tracking--0.03em" id="pomo-guide-title">
          Pomo 설명서
        </h2>
        <p class="mb-0 mt-2 text-sm leading-6 text-muted-foreground">
          장면 속 핀과 함께 집중하고 쉬는 방법을 알아보세요.
        </p>
      </header>

      <div class="divide-y divide-border">
        <For each={GUIDE_SECTIONS}>
          {(section) => (
            <section class="py-5 first:pt-0 last:pb-0">
              <h3 class="m-0 text-base font-750 text-foreground">{section.title}</h3>
              <ul class="mb-0 mt-3 grid gap-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-highlight">
                <For each={section.details}>{(detail) => <li>{detail}</li>}</For>
              </ul>
            </section>
          )}
        </For>
      </div>
    </section>
  </Tabs.Content>
)
