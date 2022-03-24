import {createWrap} from '../'
import {createSignal} from 'solid-js'
import {fireEvent, render, screen} from 'solid-testing-library'

describe('wrap', () => {
  it('should return value', async () => {
    interface Props {
      value: string
    }
    const Component = (props: Props) => {
      const [value, setValue] = createWrap(props)
      const onChangeValue = () => {
        setValue((prev) => `${prev}o`)
      }
      return <div>
        <button onClick={onChangeValue}>change</button>
        <div>{value()}</div>
      </div>
    }
    const Root = () => {
      const [value, setValue] = createSignal('foo')
      const onChangeValue = () => {
        setValue((prev) => `${prev}o`)
      }
      return <div>
        <button onClick={onChangeValue}>change</button>
        <Component value={value()} />
      </div>
    }
    await render(Root)
  })
})
