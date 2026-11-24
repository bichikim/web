use super::*;

#[test]
fn should_report_full_image_dimensions_with_a_bounded_preview() {
    let original = DynamicImage::new_rgb8(2000, 1000);
    let preview = preview(&original).unwrap();
    let bytes = STANDARD
        .decode(preview.url.split_once(',').unwrap().1)
        .unwrap();
    let thumbnail = image::load_from_memory_with_format(&bytes, ImageFormat::Png).unwrap();

    assert_eq!((preview.width, preview.height), (2000, 1000));
    assert_eq!((thumbnail.width(), thumbnail.height()), (1600, 800));
}

#[test]
fn should_publish_a_complete_document_without_depending_on_old_output_cleanup() {
    let workspace = Workspace::new().unwrap();
    let original =
        DynamicImage::ImageRgb8(image::RgbImage::from_pixel(4, 3, image::Rgb([255, 0, 0])));
    let replacement =
        DynamicImage::ImageRgb8(image::RgbImage::from_pixel(4, 3, image::Rgb([0, 255, 0])));
    let source = tempfile::Builder::new().suffix(".png").tempfile().unwrap();
    original.save(source.path()).unwrap();
    import(&workspace, source.path()).unwrap();
    let input = workspace.document_path("input.png").unwrap();
    // Reproduce a failed output cleanup without relying on machine disk capacity.
    std::fs::create_dir(workspace.document_path("output.png").unwrap()).unwrap();
    replacement.save(source.path()).unwrap();
    let preview = import(&workspace, source.path()).unwrap();
    assert_eq!((preview.width, preview.height), (4, 3));
    let current = workspace.document_path("input.png").unwrap();
    assert_ne!(current, input);
    assert_eq!(
        image::open(current).unwrap().to_rgb8().get_pixel(0, 0).0,
        [0, 255, 0]
    );
    assert!(!workspace.document_path("output.png").unwrap().exists());
}

#[test]
fn should_preserve_document_when_replacement_cannot_be_decoded() {
    let workspace = Workspace::new().unwrap();
    let source = tempfile::Builder::new().suffix(".png").tempfile().unwrap();
    DynamicImage::new_rgb8(3, 4).save(source.path()).unwrap();
    import(&workspace, source.path()).unwrap();
    let input = workspace.document_path("input.png").unwrap();
    let before = std::fs::read(&input).unwrap();
    std::fs::write(source.path(), b"invalid PNG").unwrap();
    assert!(import(&workspace, source.path()).is_err());
    assert_eq!(workspace.document_path("input.png").unwrap(), input);
    assert_eq!(std::fs::read(input).unwrap(), before);
}

#[test]
fn should_preserve_the_previous_output_if_cancellation_precedes_publication() {
    let workspace = Arc::new(Workspace::new().unwrap());
    *workspace.document.lock().unwrap() = Some(tempfile::tempdir().unwrap());
    let output = workspace.document_path("output.png").unwrap();
    let pending = workspace.document_path("pending.png").unwrap();
    std::fs::write(&output, b"previous result").unwrap();
    std::fs::write(&pending, b"next result").unwrap();

    let session = UpscaleSession::begin(workspace.clone()).unwrap();
    assert!(workspace.cancel().unwrap());
    assert!(UpscaleSession::begin(workspace.clone()).is_err());
    assert!(!session.publish(&pending).unwrap());
    assert_eq!(std::fs::read(&output).unwrap(), b"previous result");
    drop(session);

    let next = UpscaleSession::begin(workspace.clone()).unwrap();
    assert!(next.publish(&pending).unwrap());
    assert!(!workspace.cancel().unwrap());
    assert_eq!(std::fs::read(&output).unwrap(), b"next result");
}
