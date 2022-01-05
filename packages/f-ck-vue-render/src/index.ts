import {parseAndGenerateServices} from '@typescript-eslint/typescript-estree'

const code = `
export const IndexPage = defineComponent({
  render() {
    return (
      h('div', 'hello index page')
    )
  },
  setup() {
    return {}
  },
})

export const foo: string = 'foo'
`

const result: any = parseAndGenerateServices(code, {})

console.log(result.ast.body)
// console.log(result.body[0]?.declaration)
// console.log(result.body[0]?.declaration.declarations)
