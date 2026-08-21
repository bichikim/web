import {expect, it} from 'vitest'

import {getPrimaryMoodIcon, PRIMARY_MOOD_IDS} from '../index'

it('should provide an original and scribble icon for every primary mood', () => {
  for (const moodId of PRIMARY_MOOD_IDS) {
    const originalIcon = getPrimaryMoodIcon(moodId, 'original')
    const scribbleIcon = getPrimaryMoodIcon(moodId, 'scribble')

    expect(originalIcon).toBeTruthy()
    expect(scribbleIcon).toBeTruthy()
    expect(scribbleIcon).not.toBe(originalIcon)
  }
})
