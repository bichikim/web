import {rounededPolygon, RounededPolygonProps} from './clip-path'
import {Meta, StoryObj} from 'storybook-solidjs'

const Template = (props: RounededPolygonProps & {height: number; width: number}) => {
  return (
    <>
      <div
        class="test"
        style={{
          'background-color': 'red',
          'clip-path': rounededPolygon({
            bottomLeft: props.bottomLeft,
            bottomRight: props.bottomRight,
            padding: props.padding,
            topLeft: props.topLeft,
            topRight: props.topRight,
          }),
          height: `${props.height}px`,
          width: `${props.width}px`,
        }}
      >
        Hello
      </div>
    </>
  )
}

const meta = {
  argTypes: {
    height: {control: 'number'},
    width: {control: 'number'},
  },
  component: Template,
  title: 'BPlan/Styles/ClipPath',
} satisfies Meta<typeof Template>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    bottomLeft: 10,
    bottomRight: 30,
    height: 150,
    padding: 0,
    topLeft: 80,
    topRight: 20,
    width: 150,
  },
}
