import {expect, it} from 'vitest'
import {spokenText, voiceMessage} from '../text'

it('should preserve Markdown list item boundaries without speaking their markers', () => {
  expect(spokenText('준비물입니다.\n- **사과** `3개`\n- 우유\n\n다음 안내입니다.')).toBe(
    '준비물입니다.\n\n사과 3개\n\n우유\n\n다음 안내입니다.',
  )
})

it('should preserve nested list boundaries while keeping soft line wraps within an item', () => {
  expect(spokenText('- 첫 항목의\n  이어지는 설명\n  - 안쪽 항목\n- 마지막 항목')).toBe(
    '첫 항목의 이어지는 설명\n\n안쪽 항목\n\n마지막 항목',
  )
})

it('should keep negative numbers, inline hyphens and escaped list markers within prose', () => {
  expect(spokenText('온도 -10도와 A-B, `-flag`를 확인해요.\n\\- 목록이 아닌 설명')).toBe(
    '온도 -10도와 A-B, -flag를 확인해요. - 목록이 아닌 설명',
  )
})

it.each(['Codex가 작업하고 있어요.', 'Codex가 도구를 사용하고 있어요.'])(
  'should silence the working placeholder %s without suppressing actual conversation',
  (text) => {
    const activity = {
      notificationId: 1,
      phase: 'working' as const,
      receivedAt: 1,
      sessionId: 'chat',
      text,
      tool: 'Bash',
    }
    expect(voiceMessage(activity)).toBeNull()
    expect(voiceMessage({...activity, phase: 'response', response: text})?.text).toBe(text)
    expect(
      voiceMessage(activity, [
        {
          id: 'request',
          questions: [{id: 'question', options: [], question: text}],
          sessionId: 'chat',
          turnId: 'turn',
        },
      ])?.text,
    ).toBe(text)
  },
)

it('should still read actual working progress messages', () => {
  expect(
    voiceMessage({
      notificationId: 1,
      phase: 'working',
      receivedAt: 1,
      sessionId: 'chat',
      text: '음성 재생 경로를 확인하고 있습니다.',
      tool: 'Bash',
    }),
  ).toEqual({chat: 'chat', id: '1', text: '음성 재생 경로를 확인하고 있습니다.'})
})

it('should omit code blocks while preserving inline text, prose and link labels', () => {
  expect(
    spokenText(
      '# 안내\n\n**완료**했어요. `ddddd`도 읽어요.\n\n```ts\nconst hidden = 1\n```\n\n    hiddenCommand()\n\n[문서](https://example.com) 확인해요.\n![그림](hidden.png)',
    ),
  ).toBe('안내 완료했어요. ddddd도 읽어요. 문서 확인해요.')
})
it('should exclude an unfinished fenced code block', () => {
  expect(spokenText('다음 작업입니다.\n~~~js\nneverRead()')).toBe('다음 작업입니다.')
})
it('should prefer the visible response and identify distinct notifications', () => {
  const activity = {
    notificationId: 2,
    phase: 'response' as const,
    receivedAt: 1,
    response: '실제 **응답**',
    sessionId: 'chat',
    text: '응답 도착',
    tool: 'secret-command',
  }
  expect(voiceMessage(activity)).toEqual({chat: 'chat', id: '2', text: '실제 응답'})
  expect(voiceMessage({...activity, notificationId: 3})?.id).toBe('3')
  expect(voiceMessage(undefined)).toBeNull()
})
it('should read the question without approval command contents or hidden tool labels', () => {
  const activity = {
    notificationId: 1,
    phase: 'question' as const,
    receivedAt: 1,
    sessionId: 'chat',
    text: '질문 도착',
    tool: 'secret-command',
  }
  expect(
    voiceMessage(activity, [
      {
        id: 'request',
        questions: [{id: 'question', options: [], question: '어떤 색인가요?'}],
        sessionId: 'chat',
        turnId: 'turn',
      },
    ]),
  ).toEqual({chat: 'chat', id: 'request', text: '어떤 색인가요?'})
})

it('should omit HTML code spans and blocks rather than reading their text nodes', () => {
  expect(spokenText('앞쪽 <code>secret()</code> 뒤쪽\n\n<pre>hidden()</pre>')).toBe('앞쪽 뒤쪽')
})

it('should preserve prose after an HTML tag written inside inline code', () => {
  expect(spokenText('태그 `<code>` 뒤의 설명입니다.')).toBe('태그 <code> 뒤의 설명입니다.')
})

it.each([
  ['`ddddd`', 'ddddd'],
  ['모델은 `Full`이고 속도는 `1.5`입니다.', '모델은 Full이고 속도는 1.5입니다.'],
  ['``a ` b``', 'a ` b'],
])('should preserve inline contents in %s', (markdown, expected) => {
  expect(spokenText(markdown)).toBe(expected)
})

it('should read a response consisting entirely of backtick-wrapped text', () => {
  expect(
    voiceMessage({
      notificationId: 3,
      phase: 'response',
      receivedAt: 1,
      response: '`ddddd`',
      sessionId: 'chat',
      text: '응답 도착',
      tool: null,
    }),
  ).toEqual({chat: 'chat', id: '3', text: 'ddddd'})
})
