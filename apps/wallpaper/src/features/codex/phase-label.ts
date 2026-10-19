import type {CodexPhase} from './types'

export const codexPhaseLabel = (phase: CodexPhase): string => {
  switch (phase) {
    case 'question':
      return '질문'
    case 'idle':
      return '연결됨'
    case 'working':
      return '작업 중'
    case 'approval':
      return '승인 대기'
    case 'response':
      return '응답 도착'
    case 'interrupted':
      return '중단됨'
    default: {
      const unexpected: never = phase
      throw new Error(`Unknown Codex phase: ${unexpected}`)
    }
  }
}
