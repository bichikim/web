import type {TarotLocale} from './cards'
import foolImage from './assets/cards/fool.png'
import magicianImage from './assets/cards/magician.png'
import highPriestessImage from './assets/cards/high-priestess.png'
import empressImage from './assets/cards/empress.png'
import emperorImage from './assets/cards/emperor.png'
import hierophantImage from './assets/cards/hierophant.png'
import loversImage from './assets/cards/lovers.png'
import chariotImage from './assets/cards/chariot.png'
import strengthImage from './assets/cards/strength.png'
import hermitImage from './assets/cards/hermit.png'
import wheelOfFortuneImage from './assets/cards/wheel-of-fortune.png'
import justiceImage from './assets/cards/justice.png'
import hangedManImage from './assets/cards/hanged-man.png'
import deathImage from './assets/cards/death.png'
import temperanceImage from './assets/cards/temperance.png'
import devilImage from './assets/cards/devil.png'
import towerImage from './assets/cards/tower.png'
import starImage from './assets/cards/star.png'
import moonImage from './assets/cards/moon.png'
import sunImage from './assets/cards/sun.png'
import judgementImage from './assets/cards/judgement.png'
import worldImage from './assets/cards/world.png'
import wandsAceImage from './assets/cards/wands-ace.png'
import wandsTwoImage from './assets/cards/wands-two.png'
import wandsThreeImage from './assets/cards/wands-three.png'
import wandsFourImage from './assets/cards/wands-four.png'
import wandsFiveImage from './assets/cards/wands-five.png'
import wandsSixImage from './assets/cards/wands-six.png'
import wandsSevenImage from './assets/cards/wands-seven.png'
import wandsEightImage from './assets/cards/wands-eight.png'
import wandsNineImage from './assets/cards/wands-nine.png'
import wandsTenImage from './assets/cards/wands-ten.png'
import wandsPageImage from './assets/cards/wands-page.png'
import wandsKnightImage from './assets/cards/wands-knight.png'
import wandsQueenImage from './assets/cards/wands-queen.png'
import wandsKingImage from './assets/cards/wands-king.png'
import cupsAceImage from './assets/cards/cups-ace.png'
import cupsTwoImage from './assets/cards/cups-two.png'
import cupsThreeImage from './assets/cards/cups-three.png'
import cupsFourImage from './assets/cards/cups-four.png'
import cupsFiveImage from './assets/cards/cups-five.png'
import cupsSixImage from './assets/cards/cups-six.png'
import cupsSevenImage from './assets/cards/cups-seven.png'
import cupsEightImage from './assets/cards/cups-eight.png'
import cupsNineImage from './assets/cards/cups-nine.png'
import cupsTenImage from './assets/cards/cups-ten.png'
import cupsPageImage from './assets/cards/cups-page.png'
import cupsKnightImage from './assets/cards/cups-knight.png'
import cupsQueenImage from './assets/cards/cups-queen.png'
import cupsKingImage from './assets/cards/cups-king.png'
import swordsAceImage from './assets/cards/swords-ace.png'
import swordsTwoImage from './assets/cards/swords-two.png'
import swordsThreeImage from './assets/cards/swords-three.png'
import swordsFourImage from './assets/cards/swords-four.png'
import swordsFiveImage from './assets/cards/swords-five.png'
import swordsSixImage from './assets/cards/swords-six.png'
import swordsSevenImage from './assets/cards/swords-seven.png'
import swordsEightImage from './assets/cards/swords-eight.png'
import swordsNineImage from './assets/cards/swords-nine.png'
import swordsTenImage from './assets/cards/swords-ten.png'
import swordsPageImage from './assets/cards/swords-page.png'
import swordsKnightImage from './assets/cards/swords-knight.png'
import swordsQueenImage from './assets/cards/swords-queen.png'
import swordsKingImage from './assets/cards/swords-king.png'
import pentaclesAceImage from './assets/cards/pentacles-ace.png'
import pentaclesTwoImage from './assets/cards/pentacles-two.png'
import pentaclesThreeImage from './assets/cards/pentacles-three.png'
import pentaclesFourImage from './assets/cards/pentacles-four.png'
import pentaclesFiveImage from './assets/cards/pentacles-five.png'
import pentaclesSixImage from './assets/cards/pentacles-six.png'
import pentaclesSevenImage from './assets/cards/pentacles-seven.png'
import pentaclesEightImage from './assets/cards/pentacles-eight.png'
import pentaclesNineImage from './assets/cards/pentacles-nine.png'
import pentaclesTenImage from './assets/cards/pentacles-ten.png'
import pentaclesPageImage from './assets/cards/pentacles-page.png'
import pentaclesKnightImage from './assets/cards/pentacles-knight.png'
import pentaclesQueenImage from './assets/cards/pentacles-queen.png'
import pentaclesKingImage from './assets/cards/pentacles-king.png'

export interface TarotArtwork {
  readonly image: string
  readonly marker: Readonly<Record<TarotLocale, string>>
}

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
