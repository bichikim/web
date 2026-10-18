import {expect, it} from 'vitest'
import {readBrowserTab} from '../read-browser-tab'

const url = `http://127.0.0.1:50592/#token=${'a'.repeat(64)}`

it('should detect a closed viewer from the actual Browser context response', () => {
  expect(
    readBrowserTab(
      '{\n  "browserOpen": false,\n  "tabs": []\n}\nThe Browser pane is not open.',
      url,
    ),
  ).toBeUndefined()
})
it('should find the viewer tab by its dedicated server origin', () => {
  const viewer = {isActive: false, origin: 'http://127.0.0.1:50592', tabId: 'seed'}
  const tabs = [{isActive: true, origin: 'https://example.com', tabId: 'other'}, viewer]
  expect(
    readBrowserTab(
      `${JSON.stringify({browserOpen: true, tabs})}\nThe Browser pane is currently displayed.`,
      url,
    ),
  ).toEqual(viewer)
})
it('should reject unreadable context instead of navigating over a potentially open draft', () => {
  expect(() => readBrowserTab('Browser is unavailable.', url)).toThrow()
  expect(() => readBrowserTab({tabs: [{tabId: 'seed'}]}, url)).toThrow()
})

it('should read the MCP content blocks returned by the Desktop tool call', () => {
  const viewer = {isActive: true, origin: 'http://127.0.0.1:50592', tabId: 'seed'}
  expect(
    readBrowserTab(
      [
        {
          text: `${JSON.stringify({browserOpen: true, tabs: [viewer]})}\nThe Browser pane is currently displayed.`,
          type: 'text',
        },
      ],
      url,
    ),
  ).toEqual(viewer)
})

it('should ignore the URL example in the unopened Browser response', () => {
  const text = `${JSON.stringify({browserOpen: false, tabs: []}, null, 2)}\nThe Browser pane isn't open yet, so there are no tabs. Call preview_start or navigate with {"url": "https://…"} to open it.`
  expect(readBrowserTab([{text, type: 'text'}], url)).toBeUndefined()
})
