# PCM16 WAV buffer

`createPcm16WavBuffer` allocates the existing 44-byte RIFF/WAVE header plus a
zero-filled payload. The caller owns the returned buffer and writes its samples
starting at `PCM16_WAV_HEADER_BYTES`.

The mono encoder and generated stereo encoder share the header layout while
retaining their own sample conversion, clipping, frame selection, return shape,
and validation. The buffer builder adds no validation: allocation and integer
field conversion use the same native ArrayBuffer/DataView operations as before.
In particular, it does not reject sample rates that the existing encoder permits
and a downstream decoder may reject.

Native TextEncoder and DataView already supply the required byte operations. The
existing PCM16 decoder reads this format but does not write headers. Sharing the
writer between the two actual encoders is sufficient; no dependency is added.

This module is framework-independent and has no import side effects. The mono
encoder uses an explicit relative `.ts` import because the Node runner imports it
directly without application aliases.
