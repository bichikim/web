import {expect, it} from 'vitest'
import {parseLiveEvent} from '../parse-live-event'

it('should accept readiness, errors and assistant endpoints without returning transcript text', () => {
  expect(parseLiveEvent('{"type":"session.started","session":{}}')).toEqual({type: 'ready'})
  expect(parseLiveEvent('{"type":"error","error":{"message":"private"}}')).toEqual({type: 'failed'})
  expect(
    parseLiveEvent(
      '{"type":"turn.done","turn":{"role":"assistant","end_ms":1200,"transcript":"private"}}',
    ),
  ).toEqual({endMilliseconds: 1200, type: 'ended'})
})
it('should ignore malformed and unrelated events and reject invalid audio endpoints', () => {
  for (const value of [
    'invalid',
    'null',
    '[]',
    '{}',
    '{"type":"turn.done"}',
    '{"type":"turn.done","turn":{"role":"user"}}',
  ]) {
    expect(parseLiveEvent(value)).toEqual({type: 'ignored'})
  }
  expect(parseLiveEvent('{"type":"turn.done","turn":{"role":"assistant","end_ms":-1}}')).toEqual({
    endMilliseconds: 0,
    type: 'ended',
  })
  expect(
    parseLiveEvent('{"type":"turn.done","turn":{"role":"assistant","end_ms":"wrong"}}'),
  ).toEqual({endMilliseconds: 0, type: 'ended'})
})
