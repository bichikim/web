#!/usr/bin/env python3
"""Generate browser-ready focus-room depth maps with Depth Anything 3 DA3MONO-LARGE."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
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
MANIFEST_NAME = "manifest.json"


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


def load_existing_maps(output_dir: Path, process_resolution: int) -> dict[str, dict]:
    manifest_path = output_dir / MANIFEST_NAME
    if not manifest_path.exists():
        raise ValueError("--only requires an existing complete manifest")

    manifest = json.loads(manifest_path.read_text())
    if manifest.get("model") != MODEL_ID or manifest.get("revision") != MODEL_REVISION:
        raise ValueError("existing manifest uses a different model revision")
    if manifest.get("processResolution") != process_resolution:
        raise ValueError("--only must use the existing manifest process resolution")

    return {entry["source"]: entry for entry in manifest.get("maps", [])}


def main() -> None:
    arguments = parse_arguments()
    all_sources = sorted(arguments.input_dir.glob(f"{SCENE_PREFIX}*{SCENE_SUFFIX}"))
    if not all_sources:
        raise ValueError(f"no {SCENE_PREFIX}*{SCENE_SUFFIX} scenes found")

    sources = all_sources
    existing_maps: dict[str, dict] = {}
    if arguments.only:
        selected = set(arguments.only)
        sources = [source for source in sources if source.stem in selected or source.name in selected]
        matched = {source.stem for source in sources} | {source.name for source in sources}
        unmatched = selected - matched
        if unmatched:
            raise ValueError(f"unknown --only scene(s): {', '.join(sorted(unmatched))}")
        existing_maps = load_existing_maps(arguments.output_dir, arguments.process_resolution)
        selected_names = {source.name for source in sources}
        for source in all_sources:
            existing_map = existing_maps.get(source.name)
            depth_exists = existing_map and (
                arguments.output_dir / existing_map["depth"]
            ).exists()
            source_matches = existing_map and existing_map.get("sourceSha256") == file_hash(source)
            if source.name not in selected_names and (not depth_exists or not source_matches):
                raise ValueError(f"stale unselected scene in manifest: {source.name}")

    device = select_device()
    model, model_dir = load_model(arguments.da3_source, device)
    arguments.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "checkpointSha256": file_hash(model_dir / "model.safetensors"),
        "processResolution": arguments.process_resolution,
        "maps": existing_maps,
    }

    with tempfile.TemporaryDirectory(
        dir=arguments.output_dir, prefix=".staging-"
    ) as temporary_directory:
        staging_directory = Path(temporary_directory)

        for source in sources:
            prediction = model.inference(
                [str(source)],
                process_res=arguments.process_resolution,
                process_res_method="upper_bound_resize",
            )
            with Image.open(source) as source_image:
                source_size = source_image.size
            depth = normalize_depth(prediction.depth[0])
            depth_image = Image.fromarray(depth).resize(source_size, Image.Resampling.LANCZOS)
            destination = staging_directory / output_name(source)
            depth_image.save(destination, optimize=True)
            manifest["maps"][source.name] = {
                "depth": destination.name,
                "source": source.name,
                "sourceSha256": file_hash(source),
            }
            print(f"generated {destination.name} on {device}")

        expected_sources = {source.name for source in all_sources}
        manifest_sources = set(manifest["maps"])
        if manifest_sources != expected_sources:
            missing = ", ".join(sorted(expected_sources - manifest_sources))
            extra = ", ".join(sorted(manifest_sources - expected_sources))
            raise ValueError(f"manifest scene mismatch; missing=[{missing}], extra=[{extra}]")

        manifest["maps"] = [manifest["maps"][source.name] for source in all_sources]
        staged_manifest = staging_directory / MANIFEST_NAME
        staged_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

        for source in sources:
            staged_depth = staging_directory / output_name(source)
            staged_depth.replace(arguments.output_dir / staged_depth.name)
        staged_manifest.replace(arguments.output_dir / MANIFEST_NAME)


if __name__ == "__main__":
    main()
