import {action} from '@storybook/addon-actions'
import {createSignal} from 'solid-js'
import {Meta, StoryObj} from 'storybook-solidjs'
import {useWatch} from '../'

interface WatchProps {
  onCleanUp?: (...args: any) => void
  onWatch?: (...args: any) => void
  seed?: number
}

const Watch = (props: WatchProps) => {
  const [state, setState] = createSignal(0)
  useWatch([state, () => props.seed], (...args) => {
    props.onWatch?.(...args)
    return (...args) => {
      props.onCleanUp?.(...args)
    }
  })

  const increment = () => {
    setState((state) => state + 1)
  }

  return (
    <>
      <div>count {state()}</div>
      <div>seed {props.seed}</div>
      <button onClick={increment}>increment</button>
    </>
  )
}

const meta = {
  argTypes: {
    seed: {
      control: {max: 10, min: 0, step: 1, type: 'number'},
    },
  },
  args: {
    onCleanUp: action('clean-up'),
    onWatch: action('watch'),
    seed: 0,
  },
  component: Watch,
} satisfies Meta<typeof Watch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
