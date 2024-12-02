import {TestRunnerConfig} from '@storybook/test-runner'

const config: TestRunnerConfig = {
  postVisit: async (page) => {
    // Add a post-render delay in case page is still animating
    const wait = 500
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, wait))
    const screenshot = await page.screenshot()
    // expect(screenshot).toMatchImageSnapshot({})
  },
}

export default config
