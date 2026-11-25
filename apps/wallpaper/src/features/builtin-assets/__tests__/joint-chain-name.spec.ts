import {expect, it} from 'vitest'
import {touchJointChains} from '@winter-love/wallpaper/settings/touch-joint-chains'
import {builtinConnectionProfile} from '../../connection-profiles/builtin-profile'
import {jointChainName} from '../joint-chain-name'

const chains = touchJointChains(builtinConnectionProfile('builtin:ash')!.connections.touch)
const names = [
  ['left-arm', 'Left arm'],
  ['right-arm', 'Right arm'],
  ['tail', 'Tail'],
  ['touch:right-leg', 'Right leg'],
  ['touch:left-leg', 'Left leg'],
  ['touch:bag', 'Shoulder bag'],
  ['touch:ponytail-left', 'Left ponytail'],
  ['touch:ponytail-right', 'Right ponytail'],
]

it.each(names)('should display the default %s name in the chosen language', (id, name) => {
  const chain = chains.find((item) => item.id === id)!
  const original = structuredClone(chain)
  expect(jointChainName(chain, 'en')).toBe(name)
  expect(jointChainName(chain, 'ko')).toBe(chain.name)
  expect(chain).toEqual(original)
})

it('should retain custom names and user-created chains with the same name as a default', () => {
  const renamed = {...chains.find((chain) => chain.id === 'touch:bag')!, name: '나의 가방'}
  const added = {...renamed, id: 'custom', name: '숄더백'}
  expect(jointChainName(renamed, 'en')).toBe('나의 가방')
  expect(jointChainName(added, 'en')).toBe('숄더백')
  expect(jointChainName({...added, name: ''}, 'en')).toBe('')
})

it('should translate generated legacy chain labels and retain user-created lookalikes', () => {
  expect(jointChainName({id: 'legacy-2', name: '연결 2'}, 'en')).toBe('Chain 2')
  expect(jointChainName({id: 'legacy-2', name: '연결 2'}, 'ko')).toBe('연결 2')
  expect(jointChainName({id: 'legacy-2', name: '나의 연결'}, 'en')).toBe('나의 연결')
  expect(jointChainName({id: 'custom', name: '연결 2'}, 'en')).toBe('연결 2')
})
