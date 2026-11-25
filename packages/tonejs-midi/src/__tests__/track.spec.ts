import type {MidiEvent} from 'midi-file'
import {expect, it} from 'vitest'
import {Header} from '../../es-tone/Header'
import {Track} from '../../es-tone/Track'

it('should pair notes of the same pitch with note offs on their own channels', () => {
  const events: (MidiEvent & {absoluteTime: number})[] = [
    {absoluteTime: 0, channel: 0, deltaTime: 0, noteNumber: 60, type: 'noteOn', velocity: 80},
    {absoluteTime: 0, channel: 1, deltaTime: 0, noteNumber: 60, type: 'noteOn', velocity: 100},
    {absoluteTime: 240, channel: 1, deltaTime: 240, noteNumber: 60, type: 'noteOff', velocity: 0},
    {absoluteTime: 480, channel: 0, deltaTime: 240, noteNumber: 60, type: 'noteOff', velocity: 0},
  ]

  expect(new Track(events, new Header()).notes.map(({durationTicks}) => durationTicks)).toEqual([
    480, 240,
  ])
})
