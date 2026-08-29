import {emit} from './analytics'
import {secondaryKey} from './secondary'

document.querySelector('#app')!.textContent = [
  emit({total: 10}, 'checkout.complete'),
  secondaryKey,
].join(' / ')
