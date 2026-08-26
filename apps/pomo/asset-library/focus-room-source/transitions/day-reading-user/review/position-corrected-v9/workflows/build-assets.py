import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


CANVAS_SIZE = (260, 180)
MOUTH_CROP = (45, 55, 145, 125)
EXPRESSION_ROI = (55, 68, 136, 112)
DETAIL_RADIUS = 6.0
DETAIL_STRENGTH = 0.5
FEATURE_COLOR_DISTANCE = 26.0
MOUTH_CORE_COLOR_DISTANCE = 36.0
FEATURE_GROW_SIZE = 3
FEATURE_FEATHER_RADIUS = 1.0
WINDOW_FEATHER_RADIUS = 2.0
COLUMNS = 6
LABEL_HEIGHT = 24
POSITION_CORRECTIONS = {
    "open-wide-early": (0, 1),
    "narrow-round-late": (0, -1),
}

root = Path(__file__).resolve().parent.parent
day_directory = root.parent.parent
comparison_directory = root.parent / "detail-rgb-v8/assets"
source_directory = (
    day_directory
    / "archive/2026-08-25-before-inner-skin-rgb-normalization/runtime"
)
base_directory = (
    day_directory
    / "archive/2026-08-25-before-expression-rgb-restoration/runtime"
)
runtime_directory = (
    next(parent for parent in root.parents if (parent / "apps/pomo").exists())
    / "apps/pomo/src/features/focus-room-animation/assets/layers/day-reading-user"
)
asset_directory = root / "assets"
mask_directory = root / "masks"
preview_directory = root / "previews"
asset_directory.mkdir(parents=True, exist_ok=True)
mask_directory.mkdir(parents=True, exist_ok=True)
preview_directory.mkdir(parents=True, exist_ok=True)

head = Image.open(runtime_directory / "head.webp").convert("RGBA").crop((930, 285, 1190, 465))
head_rgb = np.asarray(head, dtype=np.float32)[:, :, :3]
source_paths = sorted(source_directory.glob("layer-mouth-*.webp"))

window_image = Image.new("L", CANVAS_SIZE, 0)
ImageDraw.Draw(window_image).rounded_rectangle(EXPRESSION_ROI, radius=14, fill=255)
detail_window = np.asarray(
    window_image.filter(ImageFilter.GaussianBlur(WINDOW_FEATHER_RADIUS)),
    dtype=np.float32,
) / 255.0
window_image.save(mask_directory / "detail-window.png")


def blur_rgb(rgb: np.ndarray, radius: float) -> np.ndarray:
    return np.asarray(
        Image.fromarray(np.rint(rgb).astype(np.uint8), mode="RGB").filter(
            ImageFilter.GaussianBlur(radius)
        ),
        dtype=np.float32,
    )


def add_label(image: Image.Image, label: str) -> Image.Image:
    cell = Image.new("RGBA", (CANVAS_SIZE[0], CANVAS_SIZE[1] + LABEL_HEIGHT), "white")
    cell.alpha_composite(image, (0, LABEL_HEIGHT))
    ImageDraw.Draw(cell).text((6, 5), label, fill="black")
    return cell


def make_sheet(cells: list[Image.Image], output: Path) -> None:
    rows = (len(cells) + COLUMNS - 1) // COLUMNS
    sheet = Image.new(
        "RGBA",
        (CANVAS_SIZE[0] * COLUMNS, (CANVAS_SIZE[1] + LABEL_HEIGHT) * rows),
        "white",
    )
    for index, cell in enumerate(cells):
        sheet.alpha_composite(
            cell,
            ((index % COLUMNS) * CANVAS_SIZE[0], (index // COLUMNS) * (CANVAS_SIZE[1] + LABEL_HEIGHT)),
        )
    sheet.convert("RGB").save(output)


def build_feature_mask(source_rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    color_distance = np.sqrt(np.mean(np.square(source_rgb - head_rgb), axis=2))
    x0, y0, x1, y1 = EXPRESSION_ROI
    roi = np.zeros(alpha.shape, dtype=bool)
    roi[y0:y1, x0:x1] = True
    seed = roi & (alpha > 0) & (color_distance >= FEATURE_COLOR_DISTANCE)
    seed_image = Image.fromarray(seed.astype(np.uint8) * 255, mode="L")
    grown = seed_image.filter(ImageFilter.MaxFilter(FEATURE_GROW_SIZE))
    feathered = grown.filter(ImageFilter.GaussianBlur(FEATURE_FEATHER_RADIUS))
    return np.asarray(feathered, dtype=np.float32) / 255.0 * (alpha > 0)


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


v7_cells = []
base_cells = []
candidate_cells = []
feature_mask_cells = []
focused_rows = []
metrics = []
reference_alpha = None

for source_path in source_paths:
    name = source_path.stem.removeprefix("layer-mouth-")
    source = np.asarray(Image.open(source_path).convert("RGBA"), dtype=np.uint8)
    base = np.asarray(
        Image.open(base_directory / f"layer-mouth-{name}.webp").convert("RGBA"),
        dtype=np.uint8,
    )
    v7 = np.asarray(
        Image.open(comparison_directory / f"layer-mouth-{name}.png").convert("RGBA"),
        dtype=np.uint8,
    )
    if source.shape != (CANVAS_SIZE[1], CANVAS_SIZE[0], 4) or base.shape != source.shape:
        raise ValueError(f"Unexpected canvas for {name}: {source.shape} {base.shape}")
    if not np.array_equal(source[:, :, 3], base[:, :, 3]) or not np.array_equal(
        v7[:, :, 3], base[:, :, 3]
    ):
        raise ValueError(f"Alpha differs for {name}")
    alpha = base[:, :, 3]
    if reference_alpha is None:
        reference_alpha = alpha.copy()
    elif not np.array_equal(reference_alpha, alpha):
        raise ValueError(f"Common runtime alpha differs for {name}")

    source_rgb = source[:, :, :3].astype(np.float32)
    base_rgb = base[:, :, :3].astype(np.float32)
    source_detail = source_rgb - blur_rgb(source_rgb, DETAIL_RADIUS)
    base_detail = base_rgb - blur_rgb(base_rgb, DETAIL_RADIUS)
    detail_target = np.clip(
        base_rgb
        + (source_detail - base_detail) * DETAIL_STRENGTH * detail_window[:, :, None],
        0,
        255,
    )
    feature_mask = build_feature_mask(source_rgb, alpha)
    candidate_rgb = (
        detail_target * (1.0 - feature_mask[:, :, None])
        + source_rgb * feature_mask[:, :, None]
    )
    correction = POSITION_CORRECTIONS.get(name)
    output_feature_mask = feature_mask
    if correction is not None:
        dx, dy = correction
        shifted_feature_mask = translate(feature_mask, dx, dy) * (alpha > 0)
        shifted_source_rgb = translate(source_rgb, dx, dy)
        candidate_rgb = (
            candidate_rgb * (1.0 - feature_mask[:, :, None])
            + base_rgb * feature_mask[:, :, None]
        )
        candidate_rgb = (
            candidate_rgb * (1.0 - shifted_feature_mask[:, :, None])
            + shifted_source_rgb * shifted_feature_mask[:, :, None]
        )
        output_feature_mask = shifted_feature_mask
    candidate = base.copy()
    candidate[:, :, :3] = np.rint(candidate_rgb).astype(np.uint8)
    candidate[alpha == 0, :3] = base[alpha == 0, :3]

    if not np.array_equal(candidate[:, :, 3], alpha):
        raise ValueError(f"Alpha changed for {name}")
    outside_window = detail_window == 0
    if np.any(candidate[:, :, :3][outside_window] != base[:, :, :3][outside_window]):
        raise ValueError(f"RGB changed outside the detail window for {name}")

    color_distance = np.sqrt(np.mean(np.square(source_rgb - head_rgb), axis=2))
    x0, y0, x1, y1 = EXPRESSION_ROI
    roi = np.zeros(alpha.shape, dtype=bool)
    roi[y0:y1, x0:x1] = True
    mouth_core = roi & (alpha > 0) & (color_distance >= MOUTH_CORE_COLOR_DISTANCE)
    core_reference = source[:, :, :3]
    if correction is not None:
        dx, dy = correction
        mouth_core = translate(mouth_core, dx, dy).astype(bool) & (alpha > 0)
        mouth_core &= output_feature_mask >= 0.99
        core_reference = translate(source[:, :, :3], dx, dy)
    core_max_error = int(
        np.max(
            np.abs(
                candidate[:, :, :3][mouth_core].astype(int)
                - core_reference[mouth_core].astype(int)
            )
        )
    )
    if core_max_error > 1:
        raise ValueError(f"Mouth core was not restored for {name}: {core_max_error}")

    candidate_image = Image.fromarray(candidate, mode="RGBA")
    base_image = Image.fromarray(base, mode="RGBA")
    v7_image = Image.fromarray(v7, mode="RGBA")
    candidate_image.save(asset_directory / f"layer-mouth-{name}.png")
    feature_mask_image = Image.fromarray(
        np.rint(output_feature_mask * 255).astype(np.uint8), mode="L"
    )
    feature_mask_image.save(mask_directory / f"feature-{name}.png")

    base_composite = Image.alpha_composite(head, base_image)
    v7_composite = Image.alpha_composite(head, v7_image)
    candidate_composite = Image.alpha_composite(head, candidate_image)
    base_cells.append(add_label(base_composite, name))
    v7_cells.append(add_label(v7_composite, name))
    candidate_cells.append(add_label(candidate_composite, name))
    feature_mask_cells.append(add_label(feature_mask_image.convert("RGBA"), name))

    focused = Image.new(
        "RGB",
        (MOUTH_CROP[2] - MOUTH_CROP[0], 3 * (MOUTH_CROP[3] - MOUTH_CROP[1]) + LABEL_HEIGHT),
        "white",
    )
    ImageDraw.Draw(focused).text((4, 5), name, fill="black")
    for row, image in enumerate((v7_composite, base_composite, candidate_composite)):
        focused.paste(
            image.crop(MOUTH_CROP).convert("RGB"),
            (0, LABEL_HEIGHT + row * (MOUTH_CROP[3] - MOUTH_CROP[1])),
        )
    focused_rows.append(focused)

    surround = roi & (color_distance < FEATURE_COLOR_DISTANCE)
    v7_luma_delta = np.mean(v7[:, :, :3][surround], axis=1) - np.mean(head_rgb[surround], axis=1)
    candidate_luma_delta = np.mean(candidate[:, :, :3][surround], axis=1) - np.mean(
        head_rgb[surround], axis=1
    )
    metrics.append(
        {
            "name": name,
            "position_correction": list(correction) if correction is not None else [0, 0],
            "changed_rgb_pixels_from_v6": int(
                np.count_nonzero(np.any(candidate[:, :, :3] != base[:, :, :3], axis=2))
            ),
            "feature_mask_pixels": int(np.count_nonzero(output_feature_mask > 0)),
            "v7_surround_mean_luma_delta": round(float(np.mean(v7_luma_delta)), 4),
            "candidate_surround_mean_luma_delta": round(float(np.mean(candidate_luma_delta)), 4),
            "mouth_core_max_rgb_error": core_max_error,
        }
    )

make_sheet(v7_cells, preview_directory / "v7-contact-sheet.png")
make_sheet(base_cells, preview_directory / "v6-base-contact-sheet.png")
make_sheet(candidate_cells, preview_directory / "candidate-contact-sheet.png")
make_sheet(feature_mask_cells, preview_directory / "feature-mask-contact-sheet.png")

focused_sheet = Image.new(
    "RGB",
    (len(focused_rows) * focused_rows[0].width, focused_rows[0].height),
    "white",
)
for index, row in enumerate(focused_rows):
    focused_sheet.paste(row, (index * row.width, 0))
focused_sheet.save(preview_directory / "mouth-v7-v6-candidate.png")

summary = {
    "asset_count": len(source_paths),
    "canvas": list(CANVAS_SIZE),
    "alpha_unchanged": True,
    "expression_roi": list(EXPRESSION_ROI),
    "detail_radius": DETAIL_RADIUS,
    "detail_strength": DETAIL_STRENGTH,
    "feature_color_distance": FEATURE_COLOR_DISTANCE,
    "feature_grow_size": FEATURE_GROW_SIZE,
    "feature_feather_radius": FEATURE_FEATHER_RADIUS,
    "window_feather_radius": WINDOW_FEATHER_RADIUS,
    "feature_mask_polarity": "white restores original lips and inner-mouth RGB; black keeps the detail-transfer result",
    "position_corrections": POSITION_CORRECTIONS,
    "assets": metrics,
}
(root / "metrics.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
