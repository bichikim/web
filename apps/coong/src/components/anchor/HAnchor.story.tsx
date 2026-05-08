import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {Route, Router} from '@solidjs/router'
import {HAnchor} from './HAnchor'
import {RouterNameProvider} from './RouterNameProvider'

const ROUTER_NAME_MAP = {
  about: '/about',
  home: '/home',
}

const meta = {
  args: {
    children: 'Home',
    hrefName: 'home',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Link label',
      table: {category: 'Props'},
    },
    href: {
      control: 'text',
      description: 'Override href',
      table: {category: 'Props'},
    },
    hrefName: {
      control: 'text',
      description: 'Router name key',
      table: {category: 'Props'},
    },
  },
  component: HAnchor,
  decorators: [
    (Story) => (
      <Router>
        <Route
          path="/*all"
          component={() => (
            <RouterNameProvider routerName={ROUTER_NAME_MAP}>
              <Story />
            </RouterNameProvider>
          )}
        />
      </Router>
    ),
  ],
  title: 'Coong/Components/HAnchor',
} satisfies Meta<typeof HAnchor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithHrefOverride: Story = {
  args: {
    children: 'Direct',
    href: '/direct',
    hrefName: 'home',
  },
}
