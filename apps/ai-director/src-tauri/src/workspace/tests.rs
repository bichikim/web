use super::*;

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
