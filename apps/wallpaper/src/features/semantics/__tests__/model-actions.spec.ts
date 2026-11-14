import {expect, it} from 'vitest'
import {createDemoDocument} from '@winter-love/puppet/player'
import {modelActions} from '../model-actions'

it('should display translated action names without changing the IDs used by saved connections', () => {
  const actions = modelActions({
    ...createDemoDocument(),
    expressions: [
      {id: '노트 들기', name: 'Hold Notes', parameters: []},
      {id: 'Legacy', parameters: []},
    ],
  })
  expect(actions.slice(0, 2)).toEqual([
    {action: {id: '노트 들기', kind: 'expression'}, label: 'Hold Notes'},
    {action: {id: 'Legacy', kind: 'expression'}, label: 'Legacy'},
  ])
})
