import type {TarotLocale} from './cards'
import frameImage from './assets/frame.png'
import foolImage from './assets/illustrations/fool.png'
import magicianImage from './assets/illustrations/magician.png'
import highPriestessImage from './assets/illustrations/high-priestess.png'
import empressImage from './assets/illustrations/empress.png'
import emperorImage from './assets/illustrations/emperor.png'
import hierophantImage from './assets/illustrations/hierophant.png'
import loversImage from './assets/illustrations/lovers.png'
import chariotImage from './assets/illustrations/chariot.png'
import strengthImage from './assets/illustrations/strength.png'
import hermitImage from './assets/illustrations/hermit.png'
import wheelOfFortuneImage from './assets/illustrations/wheel-of-fortune.png'
import justiceImage from './assets/illustrations/justice.png'
import hangedManImage from './assets/illustrations/hanged-man.png'
import deathImage from './assets/illustrations/death.png'
import temperanceImage from './assets/illustrations/temperance.png'
import devilImage from './assets/illustrations/devil.png'
import towerImage from './assets/illustrations/tower.png'
import starImage from './assets/illustrations/star.png'
import moonImage from './assets/illustrations/moon.png'
import sunImage from './assets/illustrations/sun.png'
import judgementImage from './assets/illustrations/judgement.png'
import worldImage from './assets/illustrations/world.png'
import wandsAceImage from './assets/illustrations/wands-ace.png'
import wandsTwoImage from './assets/illustrations/wands-two.png'
import wandsThreeImage from './assets/illustrations/wands-three.png'
import wandsFourImage from './assets/illustrations/wands-four.png'
import wandsFiveImage from './assets/illustrations/wands-five.png'
import wandsSixImage from './assets/illustrations/wands-six.png'
import wandsSevenImage from './assets/illustrations/wands-seven.png'
import wandsEightImage from './assets/illustrations/wands-eight.png'
import wandsNineImage from './assets/illustrations/wands-nine.png'
import wandsTenImage from './assets/illustrations/wands-ten.png'
import wandsPageImage from './assets/illustrations/wands-page.png'
import wandsKnightImage from './assets/illustrations/wands-knight.png'
import wandsQueenImage from './assets/illustrations/wands-queen.png'
import wandsKingImage from './assets/illustrations/wands-king.png'
import cupsAceImage from './assets/illustrations/cups-ace.png'
import cupsTwoImage from './assets/illustrations/cups-two.png'
import cupsThreeImage from './assets/illustrations/cups-three.png'
import cupsFourImage from './assets/illustrations/cups-four.png'
import cupsFiveImage from './assets/illustrations/cups-five.png'
import cupsSixImage from './assets/illustrations/cups-six.png'
import cupsSevenImage from './assets/illustrations/cups-seven.png'
import cupsEightImage from './assets/illustrations/cups-eight.png'
import cupsNineImage from './assets/illustrations/cups-nine.png'
import cupsTenImage from './assets/illustrations/cups-ten.png'
import cupsPageImage from './assets/illustrations/cups-page.png'
import cupsKnightImage from './assets/illustrations/cups-knight.png'
import cupsQueenImage from './assets/illustrations/cups-queen.png'
import cupsKingImage from './assets/illustrations/cups-king.png'
import swordsAceImage from './assets/illustrations/swords-ace.png'
import swordsTwoImage from './assets/illustrations/swords-two.png'
import swordsThreeImage from './assets/illustrations/swords-three.png'
import swordsFourImage from './assets/illustrations/swords-four.png'
import swordsFiveImage from './assets/illustrations/swords-five.png'
import swordsSixImage from './assets/illustrations/swords-six.png'
import swordsSevenImage from './assets/illustrations/swords-seven.png'
import swordsEightImage from './assets/illustrations/swords-eight.png'
import swordsNineImage from './assets/illustrations/swords-nine.png'
import swordsTenImage from './assets/illustrations/swords-ten.png'
import swordsPageImage from './assets/illustrations/swords-page.png'
import swordsKnightImage from './assets/illustrations/swords-knight.png'
import swordsQueenImage from './assets/illustrations/swords-queen.png'
import swordsKingImage from './assets/illustrations/swords-king.png'
import pentaclesAceImage from './assets/illustrations/pentacles-ace.png'
import pentaclesTwoImage from './assets/illustrations/pentacles-two.png'
import pentaclesThreeImage from './assets/illustrations/pentacles-three.png'
import pentaclesFourImage from './assets/illustrations/pentacles-four.png'
import pentaclesFiveImage from './assets/illustrations/pentacles-five.png'
import pentaclesSixImage from './assets/illustrations/pentacles-six.png'
import pentaclesSevenImage from './assets/illustrations/pentacles-seven.png'
import pentaclesEightImage from './assets/illustrations/pentacles-eight.png'
import pentaclesNineImage from './assets/illustrations/pentacles-nine.png'
import pentaclesTenImage from './assets/illustrations/pentacles-ten.png'
import pentaclesPageImage from './assets/illustrations/pentacles-page.png'
import pentaclesKnightImage from './assets/illustrations/pentacles-knight.png'
import pentaclesQueenImage from './assets/illustrations/pentacles-queen.png'
import pentaclesKingImage from './assets/illustrations/pentacles-king.png'

export interface TarotArtwork {
  readonly image: string
  readonly marker: Readonly<Record<TarotLocale, string>>
}

export const TAROT_CARD_FRAME = frameImage

export const TAROT_ARTWORK: Readonly<Record<string, TarotArtwork>> = {
  chariot: {image: chariotImage, marker: {en: '7', ko: '7'}},
  'cups-ace': {image: cupsAceImage, marker: {en: '1', ko: '1'}},
  'cups-eight': {image: cupsEightImage, marker: {en: '8', ko: '8'}},
  'cups-five': {image: cupsFiveImage, marker: {en: '5', ko: '5'}},
  'cups-four': {image: cupsFourImage, marker: {en: '4', ko: '4'}},
  'cups-king': {image: cupsKingImage, marker: {en: 'King', ko: '왕'}},
  'cups-knight': {image: cupsKnightImage, marker: {en: 'Knight', ko: '기사'}},
  'cups-nine': {image: cupsNineImage, marker: {en: '9', ko: '9'}},
  'cups-page': {image: cupsPageImage, marker: {en: 'Page', ko: '시종'}},
  'cups-queen': {image: cupsQueenImage, marker: {en: 'Queen', ko: '여왕'}},
  'cups-seven': {image: cupsSevenImage, marker: {en: '7', ko: '7'}},
  'cups-six': {image: cupsSixImage, marker: {en: '6', ko: '6'}},
  'cups-ten': {image: cupsTenImage, marker: {en: '10', ko: '10'}},
  'cups-three': {image: cupsThreeImage, marker: {en: '3', ko: '3'}},
  'cups-two': {image: cupsTwoImage, marker: {en: '2', ko: '2'}},
  death: {image: deathImage, marker: {en: '13', ko: '13'}},
  devil: {image: devilImage, marker: {en: '15', ko: '15'}},
  emperor: {image: emperorImage, marker: {en: '4', ko: '4'}},
  empress: {image: empressImage, marker: {en: '3', ko: '3'}},
  fool: {image: foolImage, marker: {en: '0', ko: '0'}},
  'hanged-man': {image: hangedManImage, marker: {en: '12', ko: '12'}},
  hermit: {image: hermitImage, marker: {en: '9', ko: '9'}},
  hierophant: {image: hierophantImage, marker: {en: '5', ko: '5'}},
  'high-priestess': {image: highPriestessImage, marker: {en: '2', ko: '2'}},
  judgement: {image: judgementImage, marker: {en: '20', ko: '20'}},
  justice: {image: justiceImage, marker: {en: '11', ko: '11'}},
  lovers: {image: loversImage, marker: {en: '6', ko: '6'}},
  magician: {image: magicianImage, marker: {en: '1', ko: '1'}},
  moon: {image: moonImage, marker: {en: '18', ko: '18'}},
  'pentacles-ace': {image: pentaclesAceImage, marker: {en: '1', ko: '1'}},
  'pentacles-eight': {image: pentaclesEightImage, marker: {en: '8', ko: '8'}},
  'pentacles-five': {image: pentaclesFiveImage, marker: {en: '5', ko: '5'}},
  'pentacles-four': {image: pentaclesFourImage, marker: {en: '4', ko: '4'}},
  'pentacles-king': {image: pentaclesKingImage, marker: {en: 'King', ko: '왕'}},
  'pentacles-knight': {image: pentaclesKnightImage, marker: {en: 'Knight', ko: '기사'}},
  'pentacles-nine': {image: pentaclesNineImage, marker: {en: '9', ko: '9'}},
  'pentacles-page': {image: pentaclesPageImage, marker: {en: 'Page', ko: '시종'}},
  'pentacles-queen': {image: pentaclesQueenImage, marker: {en: 'Queen', ko: '여왕'}},
  'pentacles-seven': {image: pentaclesSevenImage, marker: {en: '7', ko: '7'}},
  'pentacles-six': {image: pentaclesSixImage, marker: {en: '6', ko: '6'}},
  'pentacles-ten': {image: pentaclesTenImage, marker: {en: '10', ko: '10'}},
  'pentacles-three': {image: pentaclesThreeImage, marker: {en: '3', ko: '3'}},
  'pentacles-two': {image: pentaclesTwoImage, marker: {en: '2', ko: '2'}},
  star: {image: starImage, marker: {en: '17', ko: '17'}},
  strength: {image: strengthImage, marker: {en: '8', ko: '8'}},
  sun: {image: sunImage, marker: {en: '19', ko: '19'}},
  'swords-ace': {image: swordsAceImage, marker: {en: '1', ko: '1'}},
  'swords-eight': {image: swordsEightImage, marker: {en: '8', ko: '8'}},
  'swords-five': {image: swordsFiveImage, marker: {en: '5', ko: '5'}},
  'swords-four': {image: swordsFourImage, marker: {en: '4', ko: '4'}},
  'swords-king': {image: swordsKingImage, marker: {en: 'King', ko: '왕'}},
  'swords-knight': {image: swordsKnightImage, marker: {en: 'Knight', ko: '기사'}},
  'swords-nine': {image: swordsNineImage, marker: {en: '9', ko: '9'}},
  'swords-page': {image: swordsPageImage, marker: {en: 'Page', ko: '시종'}},
  'swords-queen': {image: swordsQueenImage, marker: {en: 'Queen', ko: '여왕'}},
  'swords-seven': {image: swordsSevenImage, marker: {en: '7', ko: '7'}},
  'swords-six': {image: swordsSixImage, marker: {en: '6', ko: '6'}},
  'swords-ten': {image: swordsTenImage, marker: {en: '10', ko: '10'}},
  'swords-three': {image: swordsThreeImage, marker: {en: '3', ko: '3'}},
  'swords-two': {image: swordsTwoImage, marker: {en: '2', ko: '2'}},
  temperance: {image: temperanceImage, marker: {en: '14', ko: '14'}},
  tower: {image: towerImage, marker: {en: '16', ko: '16'}},
  'wands-ace': {image: wandsAceImage, marker: {en: '1', ko: '1'}},
  'wands-eight': {image: wandsEightImage, marker: {en: '8', ko: '8'}},
  'wands-five': {image: wandsFiveImage, marker: {en: '5', ko: '5'}},
  'wands-four': {image: wandsFourImage, marker: {en: '4', ko: '4'}},
  'wands-king': {image: wandsKingImage, marker: {en: 'King', ko: '왕'}},
  'wands-knight': {image: wandsKnightImage, marker: {en: 'Knight', ko: '기사'}},
  'wands-nine': {image: wandsNineImage, marker: {en: '9', ko: '9'}},
  'wands-page': {image: wandsPageImage, marker: {en: 'Page', ko: '시종'}},
  'wands-queen': {image: wandsQueenImage, marker: {en: 'Queen', ko: '여왕'}},
  'wands-seven': {image: wandsSevenImage, marker: {en: '7', ko: '7'}},
  'wands-six': {image: wandsSixImage, marker: {en: '6', ko: '6'}},
  'wands-ten': {image: wandsTenImage, marker: {en: '10', ko: '10'}},
  'wands-three': {image: wandsThreeImage, marker: {en: '3', ko: '3'}},
  'wands-two': {image: wandsTwoImage, marker: {en: '2', ko: '2'}},
  'wheel-of-fortune': {image: wheelOfFortuneImage, marker: {en: '10', ko: '10'}},
  world: {image: worldImage, marker: {en: '21', ko: '21'}},
}
