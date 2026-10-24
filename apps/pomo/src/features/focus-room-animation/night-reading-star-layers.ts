import star01 from './assets/layers/night-reading-focused/stars/01.webp'
import star02 from './assets/layers/night-reading-focused/stars/02.webp'
import star03 from './assets/layers/night-reading-focused/stars/03.webp'
import star04 from './assets/layers/night-reading-focused/stars/04.webp'
import star05 from './assets/layers/night-reading-focused/stars/05.webp'
import star06 from './assets/layers/night-reading-focused/stars/06.webp'
import star07 from './assets/layers/night-reading-focused/stars/07.webp'
import star08 from './assets/layers/night-reading-focused/stars/08.webp'
import star09 from './assets/layers/night-reading-focused/stars/09.webp'
import star10 from './assets/layers/night-reading-focused/stars/10.webp'
import star11 from './assets/layers/night-reading-focused/stars/11.webp'
import star12 from './assets/layers/night-reading-focused/stars/12.webp'
import star13 from './assets/layers/night-reading-focused/stars/13.webp'
import star14 from './assets/layers/night-reading-focused/stars/14.webp'
import star15 from './assets/layers/night-reading-focused/stars/15.webp'
import star16 from './assets/layers/night-reading-focused/stars/16.webp'
import star17 from './assets/layers/night-reading-focused/stars/17.webp'
import {positionNightReadingLayer} from './night-reading-layer-position'

export const NIGHT_READING_STAR_LAYERS = [
  positionNightReadingLayer('stars-01', star01),
  positionNightReadingLayer('stars-02', star02),
  positionNightReadingLayer('stars-03', star03),
  positionNightReadingLayer('stars-04', star04),
  positionNightReadingLayer('stars-05', star05),
  positionNightReadingLayer('stars-06', star06),
  positionNightReadingLayer('stars-07', star07),
  positionNightReadingLayer('stars-08', star08),
  positionNightReadingLayer('stars-09', star09),
  positionNightReadingLayer('stars-10', star10),
  positionNightReadingLayer('stars-11', star11),
  positionNightReadingLayer('stars-12', star12),
  positionNightReadingLayer('stars-13', star13),
  positionNightReadingLayer('stars-14', star14),
  positionNightReadingLayer('stars-15', star15),
  positionNightReadingLayer('stars-16', star16),
  positionNightReadingLayer('stars-17', star17),
] as const
