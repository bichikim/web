import faintStar01 from './assets/layers/night-reading-focused/faint-stars/01.webp'
import faintStar02 from './assets/layers/night-reading-focused/faint-stars/02.webp'
import faintStar03 from './assets/layers/night-reading-focused/faint-stars/03.webp'
import faintStar04 from './assets/layers/night-reading-focused/faint-stars/04.webp'
import faintStar05 from './assets/layers/night-reading-focused/faint-stars/05.webp'
import faintStar06 from './assets/layers/night-reading-focused/faint-stars/06.webp'
import {positionNightReadingLayer} from './night-reading-layer-position'

export const NIGHT_READING_FAINT_STAR_LAYERS = [
  positionNightReadingLayer('faint-stars-01', faintStar01),
  positionNightReadingLayer('faint-stars-02', faintStar02),
  positionNightReadingLayer('faint-stars-03', faintStar03),
  positionNightReadingLayer('faint-stars-04', faintStar04),
  positionNightReadingLayer('faint-stars-05', faintStar05),
  positionNightReadingLayer('faint-stars-06', faintStar06),
] as const
