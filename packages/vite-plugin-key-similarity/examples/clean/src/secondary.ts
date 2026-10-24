import {emit} from './analytics'

export const secondaryKey = emit({items: 2}, 'cart.opened')
