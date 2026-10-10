import {applyPatch, parsePatch} from 'diff'
import {describe, expect, it, vi} from 'vitest'
import type {ViewerSession} from '../../shared/contracts'
import type {CodeChanges} from '../types'
import {shareCodeChanges} from '../share-code-changes'

const session: ViewerSession = {
  document: {
    lines: [[]],
    location: {column: 1, line: 1, path: 'src/main.ts'},
    revision: 'disk-revision',
    source: 'external content',
  },
  session: 'session',
  workspace: '/project/',
}
const setup = () => ({
  onError: vi.fn(),
  onNotice: vi.fn(),
  original: 'const value = 1\n',
  port: {context: vi.fn(async (_changes: CodeChanges) => {})},
  revision: 'original-revision',
  session,
  source: 'const value = 2\n',
})
describe('shareCodeChanges', () => {
  it('should attach a patch against the draft baseline instead of the refreshed document', async () => {
    const options = setup()
    await shareCodeChanges(options)
    const changes = options.port.context.mock.calls[0][0]
    expect(changes).toMatchObject({
      kind: 'changes',
      path: '/project/src/main.ts',
      revision: 'original-revision',
    })
    expect(changes.patch).toContain('-const value = 1\n+const value = 2\n')
    expect(applyPatch(options.original, changes.patch)).toBe(options.source)
    expect(options.onNotice).toHaveBeenCalledWith('변경 내용을 다음 채팅 메시지에 추가했습니다.')
    expect(options.onError).not.toHaveBeenCalled()
  })
  it('should include separate hunks without attaching unrelated unchanged lines', async () => {
    const options = setup()
    options.original = Array.from({length: 30}, (_, index) => `line ${index}\n`).join('')
    options.source = options.original
      .replace('line 1\n', '변경 1\n')
      .replace('line 28\n', '변경 28\n')
    await shareCodeChanges(options)
    const {patch} = options.port.context.mock.calls[0][0]
    expect(parsePatch(patch)[0].hunks).toHaveLength(2)
    expect(patch).not.toContain('line 15\n')
    expect(applyPatch(options.original, patch)).toBe(options.source)
  })
  it.each([
    ['줄\r\n끝\r\n', '변경\r\n끝\r\n'],
    ['원본', '수정\n'],
    ['원본\n', '수정'],
    ['', '추가\n'],
    ['삭제\n', ''],
  ])('should preserve line endings and missing final newlines for %j', async (original, source) => {
    const options = {...setup(), original, source}
    await shareCodeChanges(options)
    expect(applyPatch(original, options.port.context.mock.calls[0][0].patch)).toBe(source)
  })
  it('should acknowledge only after the host accepts the snapshot captured before later edits', async () => {
    const options = setup()
    const accepted = Promise.withResolvers<void>()
    options.port.context.mockReturnValueOnce(accepted.promise)
    const sharing = shareCodeChanges(options)
    options.source = 'later edits'
    expect(options.onNotice).not.toHaveBeenCalled()
    accepted.resolve()
    await sharing
    expect(applyPatch(options.original, options.port.context.mock.calls[0][0].patch)).toBe(
      'const value = 2\n',
    )
    expect(options.onNotice).toHaveBeenCalledOnce()
  })
  it('should report a rejected attachment without changing the draft', async () => {
    const options = setup()
    const error = new Error('host unavailable')
    options.port.context.mockRejectedValueOnce(error)
    await shareCodeChanges(options)
    expect(options.onError).toHaveBeenCalledWith(error)
    expect(options.onNotice).not.toHaveBeenCalled()
    expect(options.source).toBe('const value = 2\n')
  })
  it('should omit unchanged files and missing sessions', async () => {
    const options = setup()
    await shareCodeChanges({...options, source: options.original})
    await shareCodeChanges({...options, session: null})
    expect(options.port.context).not.toHaveBeenCalled()
    expect(options.onNotice).not.toHaveBeenCalled()
  })
  it('should report excessive changes without sending an incomplete patch', async () => {
    const options = setup()
    options.original = Array.from({length: 300}, (_, index) => `old ${index}\n`).join('')
    options.source = Array.from({length: 300}, (_, index) => `new ${index}\n`).join('')
    await shareCodeChanges(options)
    expect(options.port.context).not.toHaveBeenCalled()
    expect(options.onError).toHaveBeenCalledWith(
      expect.objectContaining({message: expect.stringContaining('변경 범위')}),
    )
    expect(options.onNotice).not.toHaveBeenCalled()
  })
})
