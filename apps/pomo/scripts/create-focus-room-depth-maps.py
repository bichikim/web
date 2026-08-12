#!/usr/bin/env python3
"""Generate browser-ready focus-room depth maps with DA3MONO-LARGE."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
import torch
from huggingface_hub import snapshot_download
from PIL import Image
from safetensors.torch import load_file


MODEL_ID = "depth-anything/DA3MONO-LARGE"
MODEL_REVISION = "f465978e618db8cc79c83b8bbf24964857db1875"
SCENE_PREFIX = "focus-room-"
SCENE_SUFFIX = "-concept.png"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--da3-source", required=True, type=Path)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("--process-resolution", default=1008, type=int)
    return parser.parse_args()


def select_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def load_model(da3_source: Path, device: torch.device):
    import sys

    sys.path.insert(0, str(da3_source / "src"))
    from depth_anything_3.api import DepthAnything3

    model_dir = Path(
        snapshot_download(
            repo_id=MODEL_ID,
            revision=MODEL_REVISION,
            allow_patterns=["config.json", "model.safetensors"],
        )
    )
    config = json.loads((model_dir / "config.json").read_text())
    model = DepthAnything3(model_name=config["model_name"])
    model.load_state_dict(load_file(model_dir / "model.safetensors"), strict=True)
    return model.eval().to(device), model_dir


def normalize_depth(depth: np.ndarray) -> np.ndarray:
    finite_depth = depth[np.isfinite(depth)]
    near_depth, far_depth = np.percentile(finite_depth, [2, 98])
    normalized = np.clip((depth - near_depth) / max(far_depth - near_depth, 1e-6), 0, 1)
    proximity = 1 - normalized
    proximity = cv2.bilateralFilter(proximity.astype(np.float32), 7, 0.035, 7)
    return np.round(proximity * 255).astype(np.uint8)


def output_name(source: Path) -> str:
    scene_name = source.name.removeprefix(SCENE_PREFIX).removesuffix(SCENE_SUFFIX)
    return f"depth-{scene_name}.png"


def file_hash(source: Path) -> str:
    digest = hashlib.sha256()
    with source.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    arguments = parse_arguments()
    device = select_device()
    model, model_dir = load_model(arguments.da3_source, device)
    sources = sorted(arguments.input_dir.glob(f"{SCENE_PREFIX}*{SCENE_SUFFIX}"))
    if arguments.only:
        selected = set(arguments.only)
        sources = [source for source in sources if source.stem in selected or source.name in selected]

    arguments.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "checkpointSha256": file_hash(model_dir / "model.safetensors"),
        "processResolution": arguments.process_resolution,
        "maps": [],
    }

    for source in sources:
        prediction = model.inference(
            [str(source)],
            process_res=arguments.process_resolution,
            process_res_method="upper_bound_resize",
        )
        source_image = Image.open(source)
        depth = normalize_depth(prediction.depth[0])
        depth_image = Image.fromarray(depth).resize(source_image.size, Image.Resampling.LANCZOS)
        destination = arguments.output_dir / output_name(source)
        depth_image.save(destination, optimize=True)
        manifest["maps"].append(
            {
                "depth": destination.name,
                "source": source.name,
                "sourceSha256": file_hash(source),
            }
        )
        print(f"generated {destination} on {device}")

    (arguments.output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    )


if __name__ == "__main__":
    main()
