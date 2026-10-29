# Occurrence remapping

`remapOccurrences` matches the values aligned with source keys to target keys. Repeated
source keys keep their value order, and each target consumes one matching value. Missing
or exhausted matches produce `undefined`. Missing or explicitly undefined source values
are skipped; extra values beyond the source keys are ignored. Other values, including
`null`, `false`, zero, and empty strings, retain their positions and identity.

Input arrays are not mutated. Matching state belongs to one synchronous call; repeated
calls do not share or retain it. The returned array follows native `Array.map` semantics
for sparse target keys.

Playlist restoration and late queue loading use this operation to keep occurrence IDs
aligned after tracks change. Length and uniqueness validation, all-or-nothing restoration,
legacy ID fallback, and active entry selection remain with those callers. Existing target
key projections are reused where available. This is a structural refactor, with no claim
of faster matching.

Native Map and arrays cover the operation. `Map.groupBy` only groups values and would
still require pairing keys with values and consuming matches. Existing playlist lookup
and fallback ID helpers have different contracts. No additional dependency is needed.
