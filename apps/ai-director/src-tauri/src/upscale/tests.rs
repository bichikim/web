use super::*;

#[test]
fn should_resize_lanczos_and_preserve_alpha() {
    let image = DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(
        3,
        5,
        image::Rgba([40, 80, 120, 128]),
    ));
    let result = resize(&image, Method::Lanczos).unwrap();
    assert_eq!((result.width(), result.height()), (12, 20));
    assert_eq!(
        *result.to_rgba8().get_pixel(6, 10),
        image::Rgba([40, 80, 120, 128])
    );
}

#[test]
fn should_reject_excessive_output_before_allocation() {
    assert!(validate_dimensions(4000, 3000).is_err());
    assert!(validate_dimensions(0, 100).is_err());
    assert!(validate_dimensions(384, 256).is_ok());
}

#[test]
fn should_run_spanf_across_tile_boundaries() {
    let image = DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
        131,
        7,
        image::Rgb([80, 120, 160]),
    ));
    let result = resize(&image, Method::Spanf).unwrap().to_rgb8();
    assert_eq!(result.dimensions(), (524, 28));
    for x in 504..520 {
        for channel in 0..3 {
            assert!((result.get_pixel(x, 14)[channel] as i16 - [80, 120, 160][channel]).abs() < 4);
        }
    }
}

#[test]
fn should_apply_exif_orientation_before_preview_and_upscale() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/upscale/fixtures/orientation.jpg");
    let source = read(&path).unwrap();
    assert_eq!((source.width(), source.height()), (8, 12));
    let output = resize(&source, Method::Lanczos).unwrap();
    assert_eq!((output.width(), output.height()), (32, 48));
}

#[test]
fn should_not_mix_hidden_rgb_into_visible_lanczos_edges() {
    let source = image::RgbaImage::from_fn(2, 1, |x, _| {
        if x == 0 {
            image::Rgba([255, 0, 0, 255])
        } else {
            image::Rgba([0, 0, 255, 0])
        }
    });
    let output = resize(&DynamicImage::ImageRgba8(source), Method::Lanczos)
        .unwrap()
        .to_rgba8();
    for pixel in output
        .pixels()
        .filter(|pixel| pixel[3] > 20 && pixel[3] < 235)
    {
        assert!(
            pixel[0] > 250 && pixel[2] < 5,
            "hidden blue leaked into {pixel:?}"
        );
    }
}

#[test]
fn should_ignore_hidden_rgb_in_spanf() {
    let source = |hidden| {
        DynamicImage::ImageRgba8(image::RgbaImage::from_fn(8, 8, |x, _| {
            if x < 4 {
                image::Rgba([200, 50, 20, 255])
            } else {
                image::Rgba([hidden, 0, 0, 0])
            }
        }))
    };
    let first = resize(&source(0), Method::Spanf).unwrap().to_rgba8();
    let second = resize(&source(255), Method::Spanf).unwrap().to_rgba8();
    for (left, right) in first
        .pixels()
        .zip(second.pixels())
        .filter(|(left, _)| left[3] > 0)
    {
        assert_eq!(left, right, "hidden RGB altered visible SPAN-F pixels");
    }
}
