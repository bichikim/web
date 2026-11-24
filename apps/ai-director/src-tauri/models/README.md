# SPAN-F

The cached `spanf.onnx` is the FP32, opset-17 export of NTIRE 2025 team 24 SPAN-F (RGB, scale 4, feature channels 32). Dynamic NCHW input `input`, output `output`; RGB float values in [0, 1]. The binary is no longer tracked by Git. The build prepares it in the shared OS `io.winterlove.models/spanf/<sha256>` cache using [the pinned manifest](../../spanf-model.json). Verified files are reused offline; missing or invalid files are downloaded from the existing immutable export URL. The build embeds the verified cached bytes so installed apps still require no model download.

- [Pinned implementation](https://github.com/Amazingren/NTIRE2025_ESR/blob/b69fb668c0362deb696eecbfdebfaa5c2fcdfcb4/models/team24_SPANF.py)
- [Pinned checkpoint](https://github.com/Amazingren/NTIRE2025_ESR/blob/b69fb668c0362deb696eecbfdebfaa5c2fcdfcb4/model_zoo/team24_spanf.pth)
- [Repository license](https://github.com/Amazingren/NTIRE2025_ESR/blob/b69fb668c0362deb696eecbfdebfaa5c2fcdfcb4/LICENSE), copied to `LICENSE`.
- SHA-256: `1bfee2f39e38b4ff2cbcdbebe9578cdbb168024fc0066b9b77035b450b331b0a`.

Export used the official checkpoint with strict loading, evaluation mode, and `torch.onnx.export(..., dynamo=False, opset_version=17)`; the constructor-only CUDA warmup was removed for CPU export. No trained parameter was changed. PyTorch is needed for regeneration only, not app execution.

Native inference uses ONNX Runtime CPU, 2 intra-op threads, 1 inter-op thread, disabled spinning, 128px input tiles with 40px overlap. Model data is compiled into the executable; inference is created only inside the SPAN-F worker process. The worker exits after saving the result. Transparent input uses premultiplied RGB for inference; alpha is resized separately with Lanczos and RGB is unpremultiplied for PNG output.

The upstream repository carries MIT; there is no separately verified checkpoint-specific license declaration. Installer publication and signing are not configured in this prototype.
