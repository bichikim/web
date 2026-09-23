import {useKeyboard, useRenderer, useTerminalDimensions} from '@opentui/solid'
import {createSignal, Show} from 'solid-js/dist/solid.js'
import {formatReviewCandidate, formatSource, type ReviewAnswer, type ReviewLabel} from '../review'
import {
  createReviewSession,
  reviewAnswerKey,
  type ReviewSessionAction,
  type ReviewTuiCandidate,
  updateReviewSession,
} from './review-session'

export interface ReviewTuiProps {
  readonly candidates: ReadonlyArray<ReviewTuiCandidate>
  readonly onComplete: (labels: ReadonlyMap<string, ReviewAnswer>) => void
}

interface ScrollPanel {
  scrollBy: (delta: number) => void
  scrollTo: (position: number) => void
}

const palette = {
  accent: '#7dd3fc',
  border: '#475569',
  dim: '#94a3b8',
  fail: '#fb7185',
  panel: '#111827',
  pass: '#4ade80',
  text: '#e2e8f0',
  uncertain: '#fbbf24',
} as const
const NARROW_TERMINAL_WIDTH = 100
const PAGE_SCROLL_LINES = 10

const verdictColor = (status: 'fail' | 'pass' | 'uncertain'): string =>
  status === 'pass' ? palette.pass : status === 'fail' ? palette.fail : palette.uncertain

const labelForKey = (keyName: string): ReviewLabel | undefined => {
  switch (keyName) {
    case 'f':
      return 'fail'
    case 'p':
      return 'pass'
    case 's':
      return 'skip'
    case 'u':
      return 'uncertain'
    default:
      return undefined
  }
}

const scrollSource = (keyName: string, sourcePanel: ScrollPanel | undefined): void => {
  switch (keyName) {
    case 'down':
      sourcePanel?.scrollBy(1)
      break
    case 'pagedown':
      sourcePanel?.scrollBy(PAGE_SCROLL_LINES)
      break
    case 'pageup':
      sourcePanel?.scrollBy(-PAGE_SCROLL_LINES)
      break
    case 'up':
      sourcePanel?.scrollBy(-1)
      break
  }
}

const ReviewCompletion = (props: {readonly labelsRecorded: number}) => (
  <box alignItems="center" flexDirection="column" flexGrow={1} justifyContent="center">
    <text fg={palette.pass}>Review complete · {props.labelsRecorded} labels recorded</text>
    <text fg={palette.text}>Enter or q saves and exits · b or Backspace revises the last item</text>
  </box>
)

export const ReviewTui = (props: ReviewTuiProps) => {
  const renderer = useRenderer()
  const terminal = useTerminalDimensions()
  const [session, setSession] = createSignal(createReviewSession())
  const [notice, setNotice] = createSignal('Enter skips without recording a label.')
  let sourcePanel: ScrollPanel | undefined
  let completed = false
  const current = () => props.candidates[session().currentIndex]
  const selectedAnswer = () => {
    const entry = current()
    return entry === undefined ? undefined : session().labels.get(reviewAnswerKey(entry.candidate))
  }
  const isNarrow = () => terminal().width < NARROW_TERMINAL_WIDTH

  const finish = (): void => {
    if (completed) {
      return
    }
    completed = true
    props.onComplete(session().labels)
    renderer.destroy()
  }

  const apply = (action: ReviewSessionAction): void => {
    const previous = session()
    const next = updateReviewSession(previous, props.candidates, action)
    if (next === previous) {
      setNotice('This is the first candidate.')
      return
    }
    setSession(next)
    sourcePanel?.scrollTo(0)
    setNotice(
      action.type === 'previous'
        ? 'Returned to the previous candidate. Choose a key to replace its label.'
        : action.type === 'next'
          ? 'Selection cleared; skipped without recording.'
          : 'Label recorded. Press b or Backspace to revise it.',
    )
  }

  useKeyboard((key) => {
    if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      finish()
      return
    }
    if (key.name === 'b' || key.name === 'backspace') {
      apply({type: 'previous'})
      return
    }
    if (current() === undefined) {
      if (key.name === 'return' || key.name === 'enter') {
        finish()
      }
      return
    }
    if (key.name === 'return' || key.name === 'enter') {
      apply({type: 'next'})
      return
    }
    if (key.name === 'a') {
      apply({type: 'accept-model'})
      return
    }
    const label = labelForKey(key.name)
    if (label !== undefined) {
      apply({label, type: 'label'})
      return
    }
    scrollSource(key.name, sourcePanel)
  })

  return (
    <box backgroundColor="#0b1020" flexDirection="column" height="100%" padding={1}>
      <Show fallback={<ReviewCompletion labelsRecorded={session().labels.size} />} when={current()}>
        {(entry) => (
          <>
            <box flexDirection="column" height={3} paddingLeft={1}>
              <text fg={palette.accent}>
                natural-lint review · {session().currentIndex + 1}/{props.candidates.length}
              </text>
              <text fg={palette.text}>
                {entry().candidate.ruleId} · {entry().candidate.relativePath}
              </text>
            </box>
            <box flexDirection={isNarrow() ? 'column' : 'row'} flexGrow={1} gap={1} minHeight={0}>
              <scrollbox
                ref={(panel) => {
                  sourcePanel = panel
                }}
                focused
                scrollX
                scrollY
                backgroundColor={palette.panel}
                border
                borderColor={palette.border}
                flexGrow={2}
                height={isNarrow() ? '58%' : '100%'}
                padding={1}
                title=" Source · ↑↓ PgUp/PgDn "
              >
                <text fg={palette.text}>{formatSource(entry().source)}</text>
              </scrollbox>
              <scrollbox
                scrollY
                backgroundColor={palette.panel}
                border
                borderColor={verdictColor(entry().candidate.observedStatus)}
                flexGrow={1}
                height={isNarrow() ? '42%' : '100%'}
                padding={1}
                title={` Model · ${entry().candidate.observedStatus.toUpperCase()} `}
              >
                <text fg={palette.text}>{formatReviewCandidate(entry().candidate)}</text>
              </scrollbox>
            </box>
            <box flexDirection="column" height={4} paddingLeft={1} paddingTop={1}>
              <text fg={palette.accent}>
                p pass · f fail · u uncertain · s skip · a accept model · Enter clear/defer · b back
                · q save & quit
              </text>
              <text fg={palette.dim}>
                {selectedAnswer() === undefined
                  ? notice()
                  : `Current selection: ${selectedAnswer()?.label} (${selectedAnswer()?.labelSource})`}
              </text>
            </box>
          </>
        )}
      </Show>
    </box>
  )
}
