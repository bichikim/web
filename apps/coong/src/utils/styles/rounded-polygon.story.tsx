import {roundedPolygon, RoundedPolygonProps} from './rounded-polygon'
import {Meta, StoryObj} from 'storybook-solidjs-vite'

const Template = (props: RoundedPolygonProps & {height: number; width: number}) => {
  return (
    <>
      <div
        class="test"
        style={{
          'background-color': 'red',
          'clip-path': roundedPolygon({
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
  title: 'Coong/Utils/Styles/RoundedPolygon',
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
