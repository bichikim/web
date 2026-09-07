import {afterEach, expect} from 'vitest'
import {page} from 'vitest/browser'

const focusRoomButtonStoryPath = '/apps/pomo/src/components/PButton.story.tsx'
const sharedControlsStoryPath = '/apps/pomo/src/components/SharedControls.story.tsx'

afterEach(async ({task}) => {
  const isPrimaryFocusRoomButtonStory =
    task.file.filepath.endsWith(focusRoomButtonStoryPath) && task.name === 'Primary'

  const isSharedControlsStory =
    task.file.filepath.endsWith(sharedControlsStoryPath) && task.name === 'Default'

  if (isPrimaryFocusRoomButtonStory) {
    const button = page.getByRole('button', {name: '집중 시작'})

    // Primary의 play 클릭이 남긴 포인터 상태를 제거해 기본 외형만 비교한다.
    await button.unhover()
    await expect.element(button).toMatchScreenshot('focus-room-button-primary')
  }

  if (isSharedControlsStory) {
    await expect
      .element(page.getByTestId('pomo-shared-controls'))
      .toMatchScreenshot('pomo-shared-controls')
  }
})
