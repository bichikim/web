import {entryFromTemplate} from '../entry-from-template'
import {parse} from 'node-html-parser'

describe('entryFromTemplate', () => {
  it('should return src from script ', () => {
    // noinspection HtmlUnknownTarget
    const result = entryFromTemplate(
      parse(`
      <html lang="kr">
        <head>
          <title>foo</title>
        </head>
        <body>
          <script type="module" src="/src/main.ts"></script>
        </body>
      </html>
    `),
    )
    expect(result).toBe('/src/main.ts')
  })
})
