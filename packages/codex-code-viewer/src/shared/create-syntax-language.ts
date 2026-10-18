import {css} from '@codemirror/lang-css'
import {html} from '@codemirror/lang-html'
import {javascriptLanguage} from '@codemirror/lang-javascript'
import {json} from '@codemirror/lang-json'
import {vue} from '@codemirror/lang-vue'
import {xml} from '@codemirror/lang-xml'
import {yaml} from '@codemirror/lang-yaml'
import {LanguageSupport, StreamLanguage} from '@codemirror/language'
import {less, sCSS} from '@codemirror/legacy-modes/mode/css'
import {properties} from '@codemirror/legacy-modes/mode/properties'
import {python} from '@codemirror/legacy-modes/mode/python'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {rust} from '@codemirror/legacy-modes/mode/rust'
import {sass} from '@codemirror/legacy-modes/mode/sass'
import {toml} from '@codemirror/legacy-modes/mode/toml'
import {astro} from '@fazelstudio/codemirror-lang-astro'
import {svelte} from '@replit/codemirror-lang-svelte'
import {tags} from '@lezer/highlight'
import type {SyntaxLanguage} from './file-formats'

const configuration = StreamLanguage.define({
  ...properties,
  token: (stream, state) => {
    const token = properties.token(stream, state)
    return token === 'def' ? 'propertyName' : token
  },
  tokenTable: {quote: tags.string},
})
const rustLanguage = StreamLanguage.define({
  ...rust,
  token: (stream, state) => {
    const token = rust.token(stream, state)
    if ((token === 'variable' || token === 'def') && stream.current() === 'r') {
      stream.match(/#[\p{XID_Start}_][\p{XID_Continue}]*/u)
    }
    return token
  },
})

const languages = {
  astro,
  css,
  html: () => html({autoCloseTags: false}),
  ini: () => new LanguageSupport(configuration),
  json,
  json5: () => new LanguageSupport(javascriptLanguage.configure({top: 'SingleExpression'})),
  jsonc: () => new LanguageSupport(javascriptLanguage.configure({top: 'SingleExpression'})),
  less: () => new LanguageSupport(StreamLanguage.define(less)),
  properties: () => new LanguageSupport(configuration),
  python: () => new LanguageSupport(StreamLanguage.define(python)),
  ruby: () => new LanguageSupport(StreamLanguage.define(ruby)),
  rust: () => new LanguageSupport(rustLanguage),
  sass: () => new LanguageSupport(StreamLanguage.define(sass)),
  scss: () => new LanguageSupport(StreamLanguage.define(sCSS)),
  svelte,
  toml: () => new LanguageSupport(StreamLanguage.define(toml)),
  vue: () => vue({base: html({autoCloseTags: false})}),
  xml,
  yaml,
} satisfies Record<SyntaxLanguage, () => LanguageSupport | null>

/** Selects a syntax parser shared by reading and editing document sources. */
export const createSyntaxLanguage = (language: SyntaxLanguage): LanguageSupport | null =>
  languages[language]()
