# Third-party notices

The sequence layout, option rendering and probability decoding follow [receptron/laya](https://github.com/receptron/laya), specifically `src/sequence.ts` and `src/laya.ts`. The original MIT license is reproduced below.

The [Laya model](https://huggingface.co/convaiinnovations/laya) is published by Convai Innovations under Apache-2.0. Model weights are downloaded and prepared separately; they are not included in this package. Keep the upstream license and any applicable notices when distributing prepared weights.

The default multilingual checkpoint is [convaiinnovations/laya-multilingual](https://huggingface.co/convaiinnovations/laya-multilingual/tree/1720e3e3357cfe1e281542e223f8273b0890ca34), also under Apache-2.0. The local exporter uses the official Apache-2.0 `laya` Python package to construct the model and follows the ONNX input/output contract from [receptron/laya's exporter](https://github.com/receptron/laya/blob/main/export/export_onnx.py).

ONNX Runtime Web and Hugging Face Tokenizers retain their own licenses in the installed dependencies.

## receptron/laya — MIT

MIT License

Copyright (c) 2026 Receptron

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
