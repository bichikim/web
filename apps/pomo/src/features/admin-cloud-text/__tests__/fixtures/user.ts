import type {AdminCloudTextUser} from '../../contracts'

export const ADMIN_USER = {
  createdAt: '2026-10-07T00:00:00.000Z',
  dailyLimitOverride: null,
  id: '00000000-0000-4000-8000-000000000001',
  providers: ['neon'],
  usage: {day: '2026-10-07', limit: 3, remaining: 2, resetsAt: '2026-10-07T15:00:00.000Z', used: 1},
} satisfies AdminCloudTextUser
