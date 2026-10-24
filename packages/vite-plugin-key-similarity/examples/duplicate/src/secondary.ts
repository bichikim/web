import {emit} from './analytics'

export const secondaryKey = emit({total: 10}, 'checkout.completed')
