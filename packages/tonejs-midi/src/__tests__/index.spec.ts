import {describe, expect, it} from 'vitest'

import {Midi} from '../index'

describe('Midi public entrypoint', () => {
  it('should create, encode, and parse a MIDI track', () => {
    const midi = new Midi()
    midi.name = 'roundtrip'
    midi.addTrack().addNote({durationTicks: 480, name: 'C4', ticks: 0, velocity: 0.75})

    const encoded = midi.toArray()
    const decoded = new Midi(encoded)

    expect(encoded).toBeInstanceOf(Uint8Array)
    expect(decoded.name).toBe('roundtrip')
    expect(decoded.tracks).toHaveLength(1)
    expect(decoded.tracks[0]?.notes[0]).toMatchObject({
      durationTicks: 480,
      name: 'C4',
      ticks: 0,
    })
  })

  it('should clone MIDI data without sharing track instances', () => {
    const midi = new Midi()
    midi.addTrack().addNote({durationTicks: 240, midi: 69, ticks: 120})

    const clone = midi.clone()

    expect(clone.toJSON()).toEqual(midi.toJSON())
    expect(clone.tracks[0]).not.toBe(midi.tracks[0])
  })

  it('should serialize control changes and pitch bends through the public track API', () => {
    const midi = new Midi()
    const track = midi.addTrack()

    track.addCC({number: 64, ticks: 120, value: 0.5})
    track.addPitchBend({ticks: 240, value: 0.25})

    expect(track.controlChanges.sustain?.[0]?.toJSON()).toMatchObject({
      number: 64,
      ticks: 120,
      value: 0.5,
    })
    expect(track.pitchBends[0]?.toJSON()).toMatchObject({ticks: 240, value: 0.25})
  })
})
