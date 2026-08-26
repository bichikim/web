import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


CORRECTIONS = {
    "open-wide-early": (0, 1),
    "narrow-round-late": (0, -1),
}
CANVAS_SIZE = (260, 180)
CROP = (45, 55, 145, 125)

root = Path(__file__).resolve().parent.parent
previous_root = root.parent / "detail-rgb-v8"
asset_directory = root / "assets"
mask_directory = root / "masks"
validation_directory = root / "validation"
validation_directory.mkdir(parents=True, exist_ok=True)


def translate(array: np.ndarray, dx: int, dy: int) -> np.ndarray:
    translated = np.roll(array, shift=(dy, dx), axis=(0, 1))
    if dy > 0:
        translated[:dy] = 0
    elif dy < 0:
        translated[dy:] = 0
    if dx > 0:
        translated[:, :dx] = 0
    elif dx < 0:
        translated[:, dx:] = 0
    return translated


def centroid(mask: np.ndarray) -> list[float]:
    ys, xs = np.indices(mask.shape)
    weights = mask.astype(np.float64)
    total = weights.sum()
    return [round(float((xs * weights).sum() / total), 4), round(float((ys * weights).sum() / total), 4)]


names = sorted(path.stem.removeprefix("layer-mouth-") for path in asset_directory.glob("layer-mouth-*.png"))
if len(names) != 24:
    raise ValueError(f"Expected 24 assets, found {len(names)}")

alpha_reference = None
unchanged_assets = []
results = []
preview = Image.new("RGB", (400, 2 * (CROP[3] - CROP[1]) + 34), "white")
ImageDraw.Draw(preview).text((4, 4), "v8 before (top) / v9 corrected (bottom)", fill="black")

for index, name in enumerate(names):
    before = np.asarray(Image.open(previous_root / "assets" / f"layer-mouth-{name}.png").convert("RGBA"))
    after = np.asarray(Image.open(asset_directory / f"layer-mouth-{name}.png").convert("RGBA"))
    if before.shape != (CANVAS_SIZE[1], CANVAS_SIZE[0], 4) or after.shape != before.shape:
        raise ValueError(f"Unexpected canvas for {name}")
    if not np.array_equal(before[:, :, 3], after[:, :, 3]):
        raise ValueError(f"Alpha changed from v8 for {name}")
    if alpha_reference is None:
        alpha_reference = after[:, :, 3].copy()
    elif not np.array_equal(alpha_reference, after[:, :, 3]):
        raise ValueError(f"Common alpha differs for {name}")

    if name not in CORRECTIONS:
        if not np.array_equal(before, after):
            raise ValueError(f"Unrequested asset changed: {name}")
        unchanged_assets.append(name)
        continue

    dx, dy = CORRECTIONS[name]
    before_mask = np.asarray(Image.open(previous_root / "masks" / f"feature-{name}.png").convert("L"))
    after_mask = np.asarray(Image.open(mask_directory / f"feature-{name}.png").convert("L"))
    expected_mask = translate(before_mask, dx, dy)
    if not np.array_equal(expected_mask, after_mask):
        raise ValueError(f"Feature mask did not move exactly for {name}")

    before_centroid = centroid(before_mask)
    after_centroid = centroid(after_mask)
    results.append(
        {
            "name": name,
            "requested_offset": [dx, dy],
            "before_centroid": before_centroid,
            "after_centroid": after_centroid,
            "measured_offset": [
                round(after_centroid[0] - before_centroid[0], 4),
                round(after_centroid[1] - before_centroid[1], 4),
            ],
            "alpha_unchanged": True,
        }
    )

    column = 0 if index == names.index("narrow-round-late") else 200
    before_image = Image.fromarray(before, mode="RGBA").crop(CROP).convert("RGB").resize((200, 140))
    after_image = Image.fromarray(after, mode="RGBA").crop(CROP).convert("RGB").resize((200, 140))
    preview.paste(before_image, (column, 34))
    preview.paste(after_image, (column, 174))

preview.save(validation_directory / "before-after-2x.png")
summary = {
    "asset_count": len(names),
    "unchanged_asset_count": len(unchanged_assets),
    "corrected_asset_count": len(results),
    "common_alpha_unchanged": True,
    "corrections": results,
}
(validation_directory / "position-validation.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
