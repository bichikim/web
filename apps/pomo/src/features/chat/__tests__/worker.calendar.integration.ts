/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {listCalendarEvents} from '../../calendar/client'
import {createDeviceCalendarTool} from '../device-calendar-tool'
import {generateRequest, loadWorker, promptMocks, runtimeMocks} from './fixtures/worker'

vi.mock('../../calendar/client', () => ({listCalendarEvents: vi.fn()}))

const clock = {now: '2026-09-05T10:30:00.000Z', timeZone: 'Asia/Seoul'}
const input = '이번 주말 말고 주말 일정 알려줘'

it('should let the device model select the calendar range and use the tool result in its reply', async () => {
  runtimeMocks.generate
    .mockResolvedValueOnce(
      JSON.stringify({
        at: '',
        end: '2026-09-14T00:00',
        name: 'calendar_lookup',
        start: '2026-09-12T00:00',
      }),
    )
    .mockResolvedValueOnce('다음 주말에는 피크닉이 있어요.')
  vi.mocked(listCalendarEvents).mockResolvedValueOnce({
    connectedConnections: 1,
    events: [
      {
        accountLabel: '테스트',
        allDay: true,
        calendarLabel: '개인',
        end: '2026-09-13',
        id: 'picnic',
        provider: 'google',
        start: '2026-09-12',
        title: '피크닉',
      },
    ],
    timeZone: clock.timeZone,
    truncated: false,
    unavailableConnections: 0,
  })
  const tool = createDeviceCalendarTool(clock)
  const worker = await loadWorker()
  try {
    expect(listCalendarEvents).not.toHaveBeenCalled()
    await worker.dispatchAndWaitForResponse(
      generateRequest({
        calendarTool: tool.endpoint,
        context: {messages: [{content: input, id: 'user', role: 'user'}], summary: ''},
      }),
      'complete',
    )
    expect(runtimeMocks.generate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        messages: [expect.objectContaining({role: 'system'}), {content: input, role: 'user'}],
        outputSchema: expect.any(Object),
      }),
    )
    expect(listCalendarEvents).toHaveBeenCalledExactlyOnceWith(
      {
        end: '2026-09-13T15:00:00.000Z',
        start: '2026-09-11T15:00:00.000Z',
        timeZone: clock.timeZone,
      },
      expect.any(AbortSignal),
    )
    expect(promptMocks.createChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({supplementaryContext: expect.stringContaining('피크닉')}),
    )
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({content: '다음 주말에는 피크닉이 있어요.'}),
        type: 'complete',
      }),
    )
  } finally {
    tool.close()
  }
})

it('should still produce a reply when the device calendar planner fails', async () => {
  runtimeMocks.generate.mockRejectedValueOnce(new Error('도구 계획 실패'))
  const tool = createDeviceCalendarTool(clock)
  const worker = await loadWorker()
  try {
    await worker.dispatchAndWaitForResponse(
      generateRequest({calendarTool: tool.endpoint}),
      'complete',
    )
    expect(listCalendarEvents).not.toHaveBeenCalled()
    expect(promptMocks.createChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        supplementaryContext: expect.stringContaining('캘린더를 조회하지 않았습니다'),
      }),
    )
  } finally {
    tool.close()
  }
})
