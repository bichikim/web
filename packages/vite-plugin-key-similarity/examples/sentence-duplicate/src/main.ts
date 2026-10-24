import {t} from './i18n'
import {astronomyFact} from './astronomy'
import {excludedPasswordMessage} from './excluded'
import {implicitRecipientMessage} from './implicit-recipient'
import {legacyPasswordMessage} from './legacy-password'
import {legacyPaymentMessage} from './legacy-payment'
import {paraphrasedMessage} from './paraphrase'
import {placeholderRecipientMessage} from './placeholder-recipient'
import {recipeNote} from './recipe'
import {resetEmailMessage} from './reset-email'
import {resetLinkMessage} from './reset-link'
import {secondaryMessage} from './secondary'
import {weatherForecast} from './weather'

document.querySelector('#app')!.textContent = [
  t('결제가 완료되었습니다.'),
  secondaryMessage,
  paraphrasedMessage,
  t('비밀번호 재설정 이메일을 보냈습니다.'),
  resetEmailMessage,
  resetLinkMessage,
  placeholderRecipientMessage,
  implicitRecipientMessage,
  excludedPasswordMessage,
  legacyPasswordMessage,
  legacyPaymentMessage,
  astronomyFact,
  recipeNote,
  weatherForecast,
].join(' / ')
