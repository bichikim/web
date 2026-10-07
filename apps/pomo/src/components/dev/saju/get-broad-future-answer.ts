const SUBJECT_PATTERN = /^(?:나의|내|제|저의|나는|저는)\s*/u
const FUTURE_PATTERN =
  /^(?:앞으로의?\s*)?(?:(?:내|제|나의|저의)\s*)?(?:미래|앞날|장래|운세|앞으로|인생|삶)(?:는|은|가|를)?/u
const QUESTION_END_PATTERN =
  /^(?:\s*(?:앞으로\s*)?(?:어떻게\s*(?:될까요|되나요|될까(?:요)?)|어때요|어떤가요|괜찮(?:을까(?:요)?|을까요)|궁금(?:해요|합니다)))?\s*[?!.]*$/u
const REQUEST_END_PATTERN = /^\s*(?:알려(?:줘|주세요)|봐(?:줘|주세요))\s*[?!.]*$/u

const BROAD_FUTURE_ANSWER =
  '미래에 어떤 일이 일어날지 사주 계산만으로 알 수는 없어요. 재물, 일, 관계 중 무엇이 궁금한지 알려주시면 관련된 사주 내용을 쉬운 말로 설명해 드릴게요.'

/** Answers broad future questions by asking the user to choose a topic. */
export function getBroadFutureAnswer(question: string): string | null {
  const subjectlessQuestion = question.trim().replace(SUBJECT_PATTERN, '')
  const future = FUTURE_PATTERN.exec(subjectlessQuestion)
  if (future === null) {
    return null
  }

  const ending = subjectlessQuestion.slice(future[0].length)
  return QUESTION_END_PATTERN.test(ending) || REQUEST_END_PATTERN.test(ending)
    ? BROAD_FUTURE_ANSWER
    : null
}
