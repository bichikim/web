import type {CalendarToolClock} from '../calendar/agent-tool-contract'
import {executeCalendarTool} from '../calendar/agent-tool'

/** Brokers a single worker tool call through the browser's authenticated calendar client. */
export const createDeviceCalendarTool = (clock: CalendarToolClock) => {
  const {port1, port2} = new MessageChannel()
  const controller = new AbortController()
  port1.onmessage = (event: MessageEvent<unknown>) => {
    port1.onmessage = null
    port1.onmessageerror = null
    executeCalendarTool(event.data, clock.timeZone, controller.signal)
      .catch(() => '캘린더 일정을 조회하지 못했습니다.')
      .then((result) => {
        if (!controller.signal.aborted) {
          port1.postMessage(result)
        }
      })
  }
  port1.onmessageerror = () => {
    port1.onmessage = null
    port1.onmessageerror = null
    port1.postMessage('캘린더 일정을 조회하지 못했습니다.')
  }

  return {
    close: () => {
      controller.abort()
      port1.close()
    },
    endpoint: {clock, port: port2},
  }
}
