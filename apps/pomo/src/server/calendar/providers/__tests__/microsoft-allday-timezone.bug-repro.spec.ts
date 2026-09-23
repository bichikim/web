/** @vitest-environment node */
/** This standalone file preserves the reproduction command referenced by issue #1299. */
import {expect, it, vi} from 'vitest'

import {createMicrosoftCalendarProvider} from '../microsoft'

it('should preserve the Microsoft all-day civil date from the issue reproduction', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({value: [{id: 'work', name: '업무'}]}))
    .mockResolvedValueOnce(
      Response.json({
        value: [
          {
            end: {dateTime: '2026-09-05T15:00:00.0000000', timeZone: 'UTC'},
            id: 'all-day',
            isAllDay: true,
            start: {dateTime: '2026-09-04T15:00:00.0000000', timeZone: 'UTC'},
            subject: '종일 일정',
          },
        ],
      }),
    )
  const provider = createMicrosoftCalendarProvider({
    clientId: 'client',
    clientSecret: 'secret',
    fetch,
  })

  await expect(
    provider.listEvents({
      accessToken: 'access',
      displayTimeZone: 'Asia/Seoul',
      end: '2026-09-08T00:00:00.000Z',
      start: '2026-09-04T00:00:00.000Z',
    }),
  ).resolves.toMatchObject({
    events: [{allDay: true, end: '2026-09-06', id: 'all-day', start: '2026-09-05'}],
  })
})
