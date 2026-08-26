# Known-working local setup

Before local execution, use MCP `server_info` to verify the actual machine and `search_models` to verify required files. Live results override this 2026-08-25 snapshot.

- Apple M5 Pro (`arm64`), 48 GiB unified memory; workspace `/Users/bichi/.local/share/comfyui-codex/ComfyUI`, server `127.0.0.1:8188`.
- Nodes: `comfyui-spectrum-minimax-h3` 0.2.3, `comfyui-applesilicon-fp8` 1.3.1, `comfyui-gguf` 2.0.0.
- Models: `minimax_h3_fl2va_pruned_int8_convrot.safetensors`, `minimax_h3_ref2va_pruned_int8_convrot.safetensors`, `qwen3vl-32B-MiniMax-H3-Q4_K_M.gguf`, `minimax_h3_video_vae_fp16.safetensors`, `minimax_h3_audio_vae_fp32.safetensors`.

This stack has completed local Pomo H3 MP4 generation through the MCP; do not reject it solely for being Apple Silicon.
