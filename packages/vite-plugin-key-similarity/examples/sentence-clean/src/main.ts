import {t} from './i18n'
import {secondaryMessage} from './secondary'

document.querySelector('#app')!.textContent = [t('결제가 완료되었습니다.'), secondaryMessage].join(
  ' / ',
)
