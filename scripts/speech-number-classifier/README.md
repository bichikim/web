# Speech number classifier data

This directory contains the small contextual classifier used only when deterministic Korean or English number rules cannot decide how a number should be spoken.

## Data ownership and sources

`training-data.json` and `evaluation-data.json` contain project-authored synthetic sentences. They are not copied corpus rows. Public text-normalization projects were used to identify categories and edge cases:

- [NVIDIA NeMo text processing](https://github.com/NVIDIA/NeMo-text-processing), Apache-2.0
- [Google Text Normalization Challenge data index](https://github.com/rwsproat/text-normalization-data), referenced for category coverage only because that repository does not state reusable data terms
- [sublee/korean number-reading tests](https://github.com/sublee/korean/blob/master/koreantests.py), used to check Korean number-reading behavior

Internet-derived behavioral cases belong in the [`normalize-speech-text.external-corpus.spec.ts`](../../apps/pomo/src/features/supertonic/__tests__/normalize-speech-text.external-corpus.spec.ts) audit suite as newly authored sentences. Do not copy source corpus rows into the model data without first recording compatible reuse terms.

## Labels

- `count`: a quantity that should use the language's counting form
- `cardinal`: a numeric amount or measurement
- `digits`: a code whose digits should be spoken individually
- `identifier`: a model, route, chapter, seat, or similar label that this normalizer must not rewrite
- `preserve`: missing, conflicting, or unsupported context that must remain unchanged

The `train` rows fit weights. The `calibration` rows select confidence and margin gates without changing weights.

## Evaluation policy

Treat `evaluation-data.json` as frozen. Do not move its failures into training or tune its wording, labels, thresholds, or features after observing its score. Correct an objectively wrong label only with a written rationale in the reviewing change.

Add newly discovered cases to an independent audit test first. A future evaluation revision must remain disjoint from training and calibration data and report both the previous and replacement results. The generator rejects a model unless exact accuracy, transformation accuracy, and zero-false-transformation gates pass.

Run `node scripts/speech-number-classifier/train-model.mjs` from the repository root to regenerate the checked-in model artifact. The generated JSON must pass the repository formatter without another rewrite.
