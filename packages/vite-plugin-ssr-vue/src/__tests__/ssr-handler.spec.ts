import {entryFromTemplate} from '../ssr-handler'
import {parse} from 'node-html-parser'

describe('entryFromTemplate', () => {
  it('should return src from script ', () => {
    const result = entryFromTemplate(parse(`
      <html lang="kr">
        <head>
          <title>foo</title>
        </head>
        <body>
          <script type="module" src="/src/main.ts"></script>
        </body>
      </html>
    `))
    expect(result).toBe('/src/main.ts')
  })
})
