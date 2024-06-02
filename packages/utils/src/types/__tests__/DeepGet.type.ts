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

const bCase: DeepGet<BCase, ['foo', 'foo']> = {} as any
const aCase: DeepGet<BCase, ['foo']> = {} as any
const jaCase: DeepGet<BCase, ['foo', 'john', 'john']> = {} as any

expectType<string>(bCase)
expectType<ACase>(aCase)
expectType<symbol>(jaCase)
