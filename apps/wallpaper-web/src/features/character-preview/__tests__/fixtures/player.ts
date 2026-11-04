import {createPlayer as create, type CreatePlayerOptions} from '@winter-love/puppet/player'
import {vi} from 'vitest'

export * from '@winter-love/puppet/player'

// Parameter assertions retain CSS geometry while bounding software WebGL pixel work.
export const createPlayer = vi.fn((options: CreatePlayerOptions) =>
  create({...options, resolution: 0.5}),
)
