import {expectType} from 'tsd'
import {DeepGet} from '../DeepGet'

interface JCase {
  john: symbol
}

interface ACase {
  foo: string
  john: JCase
}

interface BCase {
  bar: number
  foo: ACase
}

interface RootCase {
  first: {
    second: {
      third: {
        fourth: {
          fifth: Date
        }
      }
    }
  }
}

const bCase: DeepGet<BCase, ['foo', 'foo']> = {} as any
const aCase: DeepGet<BCase, ['foo']> = {} as any
const jaCase: DeepGet<BCase, ['foo', 'john', 'john']> = {} as any
const deepCase: DeepGet<RootCase, ['first', 'second', 'third', 'fourth', 'fifth']> = {} as any
const rootCase: DeepGet<RootCase, []> = {} as any

expectType<string>(bCase)
expectType<ACase>(aCase)
expectType<symbol>(jaCase)
expectType<Date>(deepCase)
expectType<RootCase>(rootCase)
