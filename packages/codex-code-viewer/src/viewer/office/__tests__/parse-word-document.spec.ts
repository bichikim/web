import {existsSync, readFileSync} from 'node:fs'
import mammoth from 'mammoth'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {parseWordDocument} from '../parse-word-document'

interface MammothModule {
  default: typeof mammoth
}
vi.mock('mammoth', async () => {
  const actual = await vi.importActual<MammothModule>('mammoth')
  return {default: {...actual.default, convertToHtml: vi.fn()}}
})
const actual = await vi.importActual<MammothModule>('mammoth')

describe('parseWordDocument', () => {
  beforeEach(() => {
    // The Node test runner uses Mammoth's Buffer input; the built viewer uses its browser adapter.
    vi.mocked(mammoth.convertToHtml).mockImplementation((input, options) =>
      actual.default.convertToHtml(
        'arrayBuffer' in input ? {buffer: Buffer.from(input.arrayBuffer)} : input,
        options,
      ),
    )
  })
  afterEach(() => vi.clearAllMocks())
  it('should read headings, formatted paragraphs, tables and embedded images from DOCX bytes', async () => {
    const fixture = 'src/viewer/office/__tests__/fixtures/document.docx'
    const bytes = Uint8Array.from(
      readFileSync(existsSync(fixture) ? fixture : `packages/codex-code-viewer/${fixture}`),
    ).buffer
    const result = await parseWordDocument(bytes)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error(result.message)
    }
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({children: [{kind: 'text', text: '한글 보고서'}], tag: 'h1'}),
        expect.objectContaining({tag: 'table'}),
      ]),
    )
    expect(JSON.stringify(result.nodes)).toContain('data:image/png;base64,')
    expect(JSON.stringify(result.nodes)).toContain('읽기 전용 문서')
  })
  it('should return a readable failure for invalid documents', async () => {
    expect(await parseWordDocument(new Uint8Array([0, 1, 2]).buffer)).toMatchObject({ok: false})
  })
})
