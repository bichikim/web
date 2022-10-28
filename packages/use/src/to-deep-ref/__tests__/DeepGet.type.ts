import {DeepGet} from '../DeepGet'
import {expectType} from 'tsd'

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
const jCase: DeepGet<BCase, ['foo', 'john', 'john']> = {} as any

expectType<string>(bCase)
expectType<ACase>(aCase)
expectType<symbol>(jCase)
