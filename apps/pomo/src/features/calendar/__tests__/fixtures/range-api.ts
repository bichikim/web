import type {apiJson} from '../../../api-json'
import type {CalendarEvent} from '../../types'

export const createRangeApi =
  (events: readonly CalendarEvent[]): typeof apiJson =>
  async (input, options) => {
    const search = new URL(String(input), 'https://fixture.invalid').searchParams
    const start = search.get('start') ?? ''
    const end = search.get('end') ?? ''
    return options.responseSchema.parse({
      connectedConnections: 1,
      events: events.filter((event) => event.start < end && event.end > start),
      timeZone: 'Asia/Seoul',
      truncated: false,
      unavailableConnections: 0,
    })
  }
