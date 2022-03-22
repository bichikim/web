import {stitches} from '../stitches'

const globalStyle = stitches.globalCss({
  body: {
    // backgroundColor: 'blue',
  },
})

const Foo = stitches.styled('foo', {
  backgroundColor: 'green',
})
const Counter: FC = (props) => {
  globalStyle()
  return (
    <div>
      <button onClick={() => props.onIncrease?.()}>foo</button>
      {props.children}
      <Foo css={{color: 'red'}}>foo</Foo>
    </div>
  )
}

export const Solid: FC = () => {
  const [count, setCount] = createSignal(1)
  const [count2, setCount2] = createSignal(1)

  const onIncrease = () => setCount((value) => value + 1)
  const onIncrease2 = () => setCount2((value) => value + 1)

  return (
    <div>
      <div>hello</div>
      <Counter>{count()}</Counter>
      <Counter onIncrease={onIncrease2}>{count2()}</Counter>
      <button onClick={onIncrease} >increase</button>
      <button onClick={onIncrease2} >increase2</button>
    </div>
  )
}
