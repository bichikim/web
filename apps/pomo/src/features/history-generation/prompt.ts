import type {HistorySourcePolicy, HistoryTargetDate} from './contract'

export const HISTORY_PROMPT_VERSION = 'today-in-history-v1'

interface BuildHistoryPromptOptions {
  readonly policy: HistorySourcePolicy
  readonly targetDate: HistoryTargetDate
}

/** Builds the stable research and Korean editing instructions for one publication date. */
export const buildHistoryPrompt = (
  options: BuildHistoryPromptOptions,
): string => `당신은 한국어 역사 피드 편집자다.

발행 대상 날짜는 ${options.targetDate.isoDate}, 시간대는 Asia/Seoul이다.
연도와 관계없이 ${options.targetDate.month}월 ${options.targetDate.day}일에 실제로 일어난 역사적 사건을 검색하라.

검색 출발점:
${options.policy.seedUrls.map((url) => `- ${url}`).join('\n')}

요구사항:
- 서로 다른 시대·지역·분야에서 3~5개 사건을 선정한다.
- 사건마다 서로 다른 publisher의 신뢰할 만한 출처 두 곳 이상으로 월·일, 연도와 핵심 사실을 확인한다.
- 검색 도구가 반환한 정확한 HTTPS URL만 sources와 각 section의 sourceUrls에 사용한다.
- title은 "{연도 표기}, {핵심 사건}" 형식이며 50자 이하로 작성한다.
- summary는 사건과 의미를 1~2문장, 한국어 80~180자로 설명한다.
- event, context, significance를 각각 한 문단으로 작성하고 세 문단의 합은 한국어 250~500자로 제한한다.
- 불확실하거나 견해가 갈리는 내용은 단정하지 않는다.
- HTML, Markdown, 이모지, 지어낸 인용문과 클릭 유도 표현을 사용하지 않는다.
- 근거가 부족한 사건은 포함하지 않는다.`
