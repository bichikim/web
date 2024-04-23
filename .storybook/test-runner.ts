import {TestRunnerConfig} from '@storybook/test-runner'
import {toMatchImageSnapshot} from 'jest-image-snapshot'

const config: TestRunnerConfig = {
  setup: () => {
    expect.extend({toMatchImageSnapshot})
  },
  postRender: async (page, context) => {
    // Add a post-render delay in case page is still animating
    await new Promise((resolve) => setTimeout(resolve, 500))
    const screenshot = await page.screenshot()
    expect(screenshot).toMatchImageSnapshot({})
  },
}

export default config