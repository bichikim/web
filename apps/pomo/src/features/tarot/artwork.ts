import type {TarotLocale} from './cards'
import frameImage from './assets/frame.png'
import foolImage from './assets/illustrations/fool.webp'
import magicianImage from './assets/illustrations/magician.webp'
import highPriestessImage from './assets/illustrations/high-priestess.webp'
import empressImage from './assets/illustrations/empress.webp'
import emperorImage from './assets/illustrations/emperor.webp'
import hierophantImage from './assets/illustrations/hierophant.webp'
import loversImage from './assets/illustrations/lovers.webp'
import chariotImage from './assets/illustrations/chariot.webp'
import strengthImage from './assets/illustrations/strength.webp'
import hermitImage from './assets/illustrations/hermit.webp'
import wheelOfFortuneImage from './assets/illustrations/wheel-of-fortune.webp'
import justiceImage from './assets/illustrations/justice.webp'
import hangedManImage from './assets/illustrations/hanged-man.webp'
import deathImage from './assets/illustrations/death.webp'
import temperanceImage from './assets/illustrations/temperance.webp'
import devilImage from './assets/illustrations/devil.webp'
import towerImage from './assets/illustrations/tower.webp'
import starImage from './assets/illustrations/star.webp'
import moonImage from './assets/illustrations/moon.webp'
import sunImage from './assets/illustrations/sun.webp'
import judgementImage from './assets/illustrations/judgement.webp'
import worldImage from './assets/illustrations/world.webp'
import wandsAceImage from './assets/illustrations/wands-ace.webp'
import wandsTwoImage from './assets/illustrations/wands-two.webp'
import wandsThreeImage from './assets/illustrations/wands-three.webp'
import wandsFourImage from './assets/illustrations/wands-four.webp'
import wandsFiveImage from './assets/illustrations/wands-five.webp'
import wandsSixImage from './assets/illustrations/wands-six.webp'
import wandsSevenImage from './assets/illustrations/wands-seven.webp'
import wandsEightImage from './assets/illustrations/wands-eight.webp'
import wandsNineImage from './assets/illustrations/wands-nine.webp'
import wandsTenImage from './assets/illustrations/wands-ten.webp'
import wandsPageImage from './assets/illustrations/wands-page.webp'
import wandsKnightImage from './assets/illustrations/wands-knight.webp'
import wandsQueenImage from './assets/illustrations/wands-queen.webp'
import wandsKingImage from './assets/illustrations/wands-king.webp'
import cupsAceImage from './assets/illustrations/cups-ace.webp'
import cupsTwoImage from './assets/illustrations/cups-two.webp'
import cupsThreeImage from './assets/illustrations/cups-three.webp'
import cupsFourImage from './assets/illustrations/cups-four.webp'
import cupsFiveImage from './assets/illustrations/cups-five.webp'
import cupsSixImage from './assets/illustrations/cups-six.webp'
import cupsSevenImage from './assets/illustrations/cups-seven.webp'
import cupsEightImage from './assets/illustrations/cups-eight.webp'
import cupsNineImage from './assets/illustrations/cups-nine.webp'
import cupsTenImage from './assets/illustrations/cups-ten.webp'
import cupsPageImage from './assets/illustrations/cups-page.webp'
import cupsKnightImage from './assets/illustrations/cups-knight.webp'
import cupsQueenImage from './assets/illustrations/cups-queen.webp'
import cupsKingImage from './assets/illustrations/cups-king.webp'
import swordsAceImage from './assets/illustrations/swords-ace.webp'
import swordsTwoImage from './assets/illustrations/swords-two.webp'
import swordsThreeImage from './assets/illustrations/swords-three.webp'
import swordsFourImage from './assets/illustrations/swords-four.webp'
import swordsFiveImage from './assets/illustrations/swords-five.webp'
import swordsSixImage from './assets/illustrations/swords-six.webp'
import swordsSevenImage from './assets/illustrations/swords-seven.webp'
import swordsEightImage from './assets/illustrations/swords-eight.webp'
import swordsNineImage from './assets/illustrations/swords-nine.webp'
import swordsTenImage from './assets/illustrations/swords-ten.webp'
import swordsPageImage from './assets/illustrations/swords-page.webp'
import swordsKnightImage from './assets/illustrations/swords-knight.webp'
import swordsQueenImage from './assets/illustrations/swords-queen.webp'
import swordsKingImage from './assets/illustrations/swords-king.webp'
import pentaclesAceImage from './assets/illustrations/pentacles-ace.webp'
import pentaclesTwoImage from './assets/illustrations/pentacles-two.webp'
import pentaclesThreeImage from './assets/illustrations/pentacles-three.webp'
import pentaclesFourImage from './assets/illustrations/pentacles-four.webp'
import pentaclesFiveImage from './assets/illustrations/pentacles-five.webp'
import pentaclesSixImage from './assets/illustrations/pentacles-six.webp'
import pentaclesSevenImage from './assets/illustrations/pentacles-seven.webp'
import pentaclesEightImage from './assets/illustrations/pentacles-eight.webp'
import pentaclesNineImage from './assets/illustrations/pentacles-nine.webp'
import pentaclesTenImage from './assets/illustrations/pentacles-ten.webp'
import pentaclesPageImage from './assets/illustrations/pentacles-page.webp'
import pentaclesKnightImage from './assets/illustrations/pentacles-knight.webp'
import pentaclesQueenImage from './assets/illustrations/pentacles-queen.webp'
import pentaclesKingImage from './assets/illustrations/pentacles-king.webp'

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
