import {type ReviewAnswer, reviewAnswerKey, type ReviewCandidate, type ReviewLabel} from '../review'

export interface ReviewTuiCandidate {
  readonly candidate: ReviewCandidate
  readonly source: string
}

export interface ReviewSession {
  readonly currentIndex: number
  readonly labels: ReadonlyMap<string, ReviewAnswer>
}

export type ReviewSessionAction =
  | {readonly type: 'accept-model'}
  | {readonly label: ReviewLabel; readonly type: 'label'}
  | {readonly type: 'next'}
  | {readonly type: 'previous'}

export const createReviewSession = (): ReviewSession => ({
  currentIndex: 0,
  labels: new Map(),
})

export const updateReviewSession = (
  session: ReviewSession,
  candidates: ReadonlyArray<ReviewTuiCandidate>,
  action: ReviewSessionAction,
): ReviewSession => {
  if (action.type === 'previous') {
    if (session.currentIndex === 0) {
      return session
    }
    return {...session, currentIndex: session.currentIndex - 1}
  }
  const current = candidates[session.currentIndex]?.candidate
  if (current === undefined) {
    return session
  }
  if (action.type === 'next') {
    const labels = new Map(session.labels)
    labels.delete(reviewAnswerKey(current))
    return {...session, currentIndex: session.currentIndex + 1, labels}
  }
  const answer: ReviewAnswer =
    action.type === 'accept-model'
      ? {label: current.observedStatus, labelSource: 'accepted-model'}
      : {label: action.label, labelSource: 'human'}
  return {
    currentIndex: session.currentIndex + 1,
    labels: new Map(session.labels).set(reviewAnswerKey(current), answer),
  }
}
