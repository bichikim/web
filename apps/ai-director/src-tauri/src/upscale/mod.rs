use image::{DynamicImage, ImageDecoder, RgbImage, imageops::FilterType};
use ort::{session::Session, value::Tensor};
use serde::Deserialize;
use std::path::Path;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    Lanczos,
    Spanf,
}

pub fn validate_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 || u64::from(width) * u64::from(height) * 16 > 40_000_000 {
        return Err("image_too_large".into());
    }
    Ok(())
}

pub fn read(path: &Path) -> Result<DynamicImage, String> {
    let reader = image::ImageReader::open(path)
        .map_err(|_| "read_failed")?
        .with_guessed_format()
        .map_err(|_| "invalid_image")?;
    let mut decoder = reader.into_decoder().map_err(|_| "invalid_image")?;
    let dimensions = decoder.dimensions();
    validate_dimensions(dimensions.0, dimensions.1)?;
    let orientation = decoder.orientation().map_err(|_| "invalid_image")?;
    let mut image = DynamicImage::from_decoder(decoder).map_err(|_| "invalid_image")?;
    image.apply_orientation(orientation);
    Ok(image)
}

pub fn resize(image: &DynamicImage, method: Method) -> Result<DynamicImage, String> {
    validate_dimensions(image.width(), image.height())?;
    match method {
        Method::Lanczos => Ok(lanczos(image)),
        Method::Spanf => spanf(image).map_err(|error| {
            eprintln!("SPAN-F: {error}");
            "upscale_failed".into()
        }),
    }
}

fn lanczos(image: &DynamicImage) -> DynamicImage {
    if !image.color().has_alpha() {
        return image.resize_exact(image.width() * 4, image.height() * 4, FilterType::Lanczos3);
    }
    let mut pixels = image.to_rgba32f();
    for pixel in pixels.pixels_mut() {
        for channel in 0..3 {
            pixel[channel] *= pixel[3];
        }
    }
    let mut pixels = image::imageops::resize(
        &pixels,
        image.width() * 4,
        image.height() * 4,
        FilterType::Lanczos3,
    );
    for pixel in pixels.pixels_mut() {
        let alpha = pixel[3];
        for channel in 0..3 {
            pixel[channel] = if alpha > 0.0 {
                (pixel[channel] / alpha).clamp(0.0, 1.0)
            } else {
                0.0
            };
        }
        pixel[3] = alpha.clamp(0.0, 1.0);
    }
    let result = DynamicImage::ImageRgba32F(pixels);
    match image.color() {
        image::ColorType::Rgba16 | image::ColorType::La16 => {
            DynamicImage::ImageRgba16(result.to_rgba16())
        }
        _ => DynamicImage::ImageRgba8(result.to_rgba8()),
    }
}

fn spanf(image: &DynamicImage) -> Result<DynamicImage, Box<dyn std::error::Error>> {
    let mut session = Session::builder()?
        .with_intra_threads(2)?
        .with_inter_threads(1)?
        .with_config_entry("session.intra_op.allow_spinning", "0")?
        .with_config_entry("session.inter_op.allow_spinning", "0")?
        .commit_from_memory(include_bytes!("../../models/spanf.onnx"))?;
    let mut source = image.to_rgb8();
    let alpha = if image.color().has_alpha() {
        Some(image::GrayImage::from_fn(
            image.width(),
            image.height(),
            |x, y| image::Luma([image::GenericImageView::get_pixel(image, x, y)[3]]),
        ))
    } else {
        None
    };
    if let Some(alpha) = &alpha {
        for (pixel, alpha) in source.pixels_mut().zip(alpha.pixels()) {
            for channel in 0..3 {
                pixel[channel] = (u16::from(pixel[channel]) * u16::from(alpha[0]) / 255) as u8;
            }
        }
    }
    let (width, height) = source.dimensions();
    let mut result = RgbImage::new(width * 4, height * 4);
    // Overlapping input pixels keep tile edges outside the copied output area.
    for top in (0..height).step_by(128) {
        for left in (0..width).step_by(128) {
            let x0 = left.saturating_sub(40);
            let y0 = top.saturating_sub(40);
            let right = (left + 128).min(width);
            let bottom = (top + 128).min(height);
            let tile_width = (right + 40).min(width) - x0;
            let tile_height = (bottom + 40).min(height) - y0;
            let plane = (tile_width * tile_height) as usize;
            let mut input = vec![0.0_f32; plane * 3];
            for y in 0..tile_height {
                for x in 0..tile_width {
                    let pixel = source.get_pixel(x0 + x, y0 + y);
                    for channel in 0..3 {
                        input[channel * plane + (y * tile_width + x) as usize] =
                            f32::from(pixel[channel]) / 255.0;
                    }
                }
            }
            let tensor =
                Tensor::from_array(([1, 3, tile_height as usize, tile_width as usize], input))?;
            let output = session.run(ort::inputs![tensor])?;
            let (_, values) = output[0].try_extract_tensor::<f32>()?;
            let output_width = tile_width * 4;
            let output_plane = plane * 16;
            for y in top * 4..bottom * 4 {
                for x in left * 4..right * 4 {
                    let offset = ((y - y0 * 4) * output_width + x - x0 * 4) as usize;
                    let pixel = result.get_pixel_mut(x, y);
                    for channel in 0..3 {
                        pixel[channel] = (values[channel * output_plane + offset].clamp(0.0, 1.0)
                            * 255.0)
                            .round() as u8;
                    }
                }
            }
        }
    }
    if let Some(alpha) = alpha {
        let alpha = image::imageops::resize(&alpha, width * 4, height * 4, FilterType::Lanczos3);
        let mut result = DynamicImage::ImageRgb8(result).to_rgba8();
        for (pixel, alpha) in result.pixels_mut().zip(alpha.pixels()) {
            for channel in 0..3 {
                pixel[channel] = if alpha[0] == 0 {
                    0
                } else {
                    (u32::from(pixel[channel]) * 255 / u32::from(alpha[0])).min(255) as u8
                };
            }
            pixel[3] = alpha[0];
        }
        Ok(DynamicImage::ImageRgba8(result))
    } else {
        Ok(DynamicImage::ImageRgb8(result))
    }
}

pub fn run_worker(arguments: &[String]) -> Result<(), String> {
    if arguments.len() != 5 {
        return Err("invalid_arguments".into());
    }
    let method = match arguments[4].as_str() {
        "lanczos" => Method::Lanczos,
        "spanf" => Method::Spanf,
        _ => return Err("invalid_method".into()),
    };
    let image = read(Path::new(&arguments[2]))?;
    resize(&image, method)?
        .save(&arguments[3])
        .map_err(|_| "save_failed".into())
}

#[cfg(test)]
mod tests;
