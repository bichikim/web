const Counter: FC = withSolid(({children}) => {
  console.log('Counter')
  return () => <div>{children}</div>
})

export const Solid: FC = withSolid(() => {
  console.log('Solid')
  const [count, setCount] = createSignal(1)
  const [count2, setCount2] = createSignal(1)

  const onIncrease = () => setCount((value) => value + 1)
  const onIncrease2 = () => setCount2((value) => value + 1)

  return () => (
    <div>
      <div>hello</div>
      <Counter>{count()}</Counter>
      <Counter>{count2()}</Counter>
      <button onClick={onIncrease} >increase</button>
      <button onClick={onIncrease2} >increase2</button>
    </div>
  )
})
