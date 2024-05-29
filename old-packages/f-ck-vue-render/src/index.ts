import {parseAndGenerateServices} from '@typescript-eslint/typescript-estree'
import {generate} from 'astring'

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
console.log(result.ast.body[0])
console.log(result.ast.body[0].declaration)
console.log(result.ast.body[0].declaration.declarations)
console.log(result.ast.body[0].declaration.declarations[0].init)
console.log(result.ast.body[0].declaration.declarations[0].init.callee)
// console.log(result.ast.body[0].declaration.declarations[0].init.arguments[0])
// console.log(result.ast.body[0].declaration.declarations[0].init.arguments[0].properties)
console.log('rebuild')
console.log(generate(result.ast))
// console.log(result.body[0]?.declaration)
// console.log(result.body[0]?.declaration.declarations)
