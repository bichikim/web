import {describe, expect, it} from 'vitest'
import * as selectMenu from '../index'
import {HSelectContent} from '../HSelectContent'
import {HSelectItem} from '../HSelectItem'
import {HSelectRoot} from '../HSelectRoot'
import {HSelectSeparator} from '../HSelectSeparator'
import {HSelectTrigger} from '../HSelectTrigger'

describe('select-menu entrypoint', () => {
  it('should expose the compound Select API using the public component exports', () => {
    expect(selectMenu.Select).toEqual({
      Content: HSelectContent,
      Item: HSelectItem,
      Root: HSelectRoot,
      Separator: HSelectSeparator,
      Trigger: HSelectTrigger,
    })
    expect(selectMenu.HSelectRoot).toBe(HSelectRoot)
    expect(selectMenu.toSelectMenuAnchorRect).toBeTypeOf('function')
    expect(selectMenu.focusMenuItemByOffset).toBeTypeOf('function')
  })
})
