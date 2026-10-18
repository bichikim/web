import {describe, expect, it} from 'vitest'
import {createPreviewStreams} from '../create-preview-streams'

describe('createPreviewStreams', () => {
  it('should expose a loopback endpoint through the current preview origin and token', () => {
    const streams = createPreviewStreams('/preview-token/')
    expect(
      streams.expose('http://127.0.0.1:9000/scan/internal-token', 'http://192.168.1.20:8000'),
    ).toMatch(/^http:\/\/192\.168\.1\.20:8000\/preview-token\/stream\/[\da-f-]+$/u)
  })
  it.each([
    'https://example.com/events',
    'http://192.168.1.20/events',
    'http://user:secret@127.0.0.1/events',
    'invalid',
    undefined,
  ])('should decline an untrusted upstream %s', (url) => {
    expect(createPreviewStreams('/preview-token/').expose(url, 'http://localhost:8000')).toBeNull()
  })
})
