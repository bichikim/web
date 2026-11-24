/// Pixel-aligned mask bounds with two pixels of antialiasing/filtering coverage.
pub fn mask_bounds(
    points: impl Iterator<Item = [f32; 2]>,
    camera: [f32; 4],
    width: u32,
    height: u32,
) -> [u32; 4] {
    let mut minimum = [width as f32, height as f32];
    let mut maximum = [0_f32; 2];
    for point in points {
        let pixel = [
            (point[0] * camera[0] + camera[2] + 1.) * width as f32 * 0.5,
            (1. - point[1] * camera[1] - camera[3]) * height as f32 * 0.5,
        ];
        for axis in 0..2 {
            minimum[axis] = minimum[axis].min(pixel[axis]);
            maximum[axis] = maximum[axis].max(pixel[axis]);
        }
    }
    let left = (minimum[0] - 2.)
        .floor()
        .clamp(0., width.saturating_sub(1) as f32) as u32;
    let top = (minimum[1] - 2.)
        .floor()
        .clamp(0., height.saturating_sub(1) as f32) as u32;
    let right = (maximum[0] + 2.).ceil().clamp(0., width as f32) as u32;
    let bottom = (maximum[1] + 2.).ceil().clamp(0., height as f32) as u32;
    [
        left,
        top,
        right.saturating_sub(left).max(1),
        bottom.saturating_sub(top).max(1),
    ]
}

/// Re-expresses the same document camera in a cropped render target.
pub fn crop_camera(camera: [f32; 4], bounds: [u32; 4], width: u32, height: u32) -> [f32; 4] {
    if bounds == [0, 0, width, height] {
        return camera;
    }
    let [left, top, span_x, span_y] = bounds.map(|value| value as f32);
    let width = width as f32;
    let height = height as f32;
    [
        camera[0] * width / span_x,
        camera[1] * height / span_y,
        ((camera[2] + 1.) * width - 2. * left) / span_x - 1.,
        1. - ((1. - camera[3]) * height - 2. * top) / span_y,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounds_cover_edges_and_antialiasing() {
        let points = [[10., 20.], [30., 40.]];
        assert_eq!(
            mask_bounds(points.into_iter(), [0.02, -0.02, -1., 1.], 100, 100),
            [7, 17, 25, 25]
        );
    }
    #[test]
    fn cropped_camera_keeps_global_pixel_positions() {
        let camera = [0.02, -0.01, -0.8, 0.7];
        let bounds = [12, 24, 80, 120];
        let cropped = crop_camera(camera, bounds, 400, 300);
        for point in [[10., 30.], [60., 70.], [-5., 10.]] {
            let global = [
                (point[0] * camera[0] + camera[2] + 1.) * 200.,
                (1. - point[1] * camera[1] - camera[3]) * 150.,
            ];
            let local = [
                (point[0] * cropped[0] + cropped[2] + 1.) * 40. + 12.,
                (1. - point[1] * cropped[1] - cropped[3]) * 60. + 24.,
            ];
            assert!((global[0] - local[0]).abs() < 0.0001);
            assert!((global[1] - local[1]).abs() < 0.0001);
        }
    }
    #[test]
    fn empty_and_offscreen_masks_keep_valid_targets() {
        for points in [vec![], vec![[1000., -1000.]], vec![[-1000., 1000.]]] {
            let bounds = mask_bounds(points.into_iter(), [1., 1., 0., 0.], 100, 100);
            assert!(bounds[0] < 100 && bounds[1] < 100 && bounds[2] >= 1 && bounds[3] >= 1);
        }
    }
}
