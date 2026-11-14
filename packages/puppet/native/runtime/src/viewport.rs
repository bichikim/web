//! Document-to-screen placement (`player/internal/layout-player-root.ts`).

use poffo_format::document::{Document, Layout};

/// Uniform scale and offset mapping document coordinates to screen pixels.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ViewportFit {
    pub scale: f64,
    pub offset: [f64; 2],
}

/// The document rectangle a screen shows and where it sits along the axis with room to spare.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Framing {
    /// `[x, y, width, height]` in document coordinates.
    pub rect: [f64; 4],
    /// Per axis from 0 (left or top) to 1 (right or bottom).
    pub align: [f64; 2],
}

impl Framing {
    /// The whole viewport, centered.
    pub fn viewport(document: &Document) -> Self {
        Self {
            rect: [0.0, 0.0, document.viewport.width, document.viewport.height],
            align: Layout::CENTER,
        }
    }

    /// The document's `layout` (Cubism's model Layout), else the whole viewport.
    pub fn of(document: &Document) -> Self {
        document.layout.map_or_else(
            || Self::viewport(document),
            |layout| Self {
                rect: [layout.x, layout.y, layout.width, layout.height],
                align: layout.align.unwrap_or(Layout::CENTER),
            },
        )
    }
}

/// Fits the framed rectangle, grown by `padding` on each side (as a fraction of its size), into
/// the screen and places it by its alignment (`fitDocument`).
pub fn fit_framing(framing: Framing, screen: [f64; 2], padding: f64) -> ViewportFit {
    let padding = padding.max(0.0);
    let [x, y, width, height] = framing.rect;
    let padded = [width, height].map(|size| size * (1.0 + padding * 2.0));
    let scale = f64::min(screen[0] / padded[0], screen[1] / padded[1]);
    let place = |axis: usize, start: f64, size: f64| {
        (screen[axis] - padded[axis] * scale) * framing.align[axis]
            + (padding * size - start) * scale
    };
    ViewportFit {
        scale,
        offset: [place(0, x, width), place(1, y, height)],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn framing(rect: [f64; 4], align: [f64; 2]) -> Framing {
        Framing { rect, align }
    }

    #[test]
    fn letterboxes_and_centers() {
        let whole = framing([0.0, 0.0, 100.0, 200.0], Layout::CENTER);
        let fit = fit_framing(whole, [400.0, 400.0], 0.0);
        assert_eq!(fit.scale, 2.0);
        assert_eq!(fit.offset, [100.0, 0.0]);
        let padded = fit_framing(whole, [400.0, 400.0], 0.5);
        assert_eq!(padded.scale, 1.0);
        assert_eq!(padded.offset, [150.0, 100.0]);
    }

    #[test]
    fn documents_frame_their_layout_else_the_viewport() {
        let document = |extra: serde_json::Value| {
            let mut value = serde_json::json!({
                "format": "winter-love-puppet", "version": 1,
                "viewport": {"width": 100, "height": 200}, "parts": [], "motions": [],
            });
            if let (Some(target), serde_json::Value::Object(extra)) = (value.as_object_mut(), extra)
            {
                target.extend(extra);
            }
            poffo_format::PoffoFile::from_value(value)
                .document()
                .expect("valid")
        };
        let whole = Framing::of(&document(serde_json::json!({})));
        assert_eq!(whole, framing([0.0, 0.0, 100.0, 200.0], Layout::CENTER));
        let layout = serde_json::json!({"layout": {"x": 1, "y": 2, "width": 3, "height": 4, "align": [0, 1]}});
        let framed = document(layout);
        assert_eq!(
            Framing::of(&framed),
            framing([1.0, 2.0, 3.0, 4.0], [0.0, 1.0])
        );
        assert_eq!(Framing::viewport(&framed), whole);
    }

    /// The same cases as the TypeScript `layout.spec.ts`.
    #[test]
    fn layouts_fit_their_rectangle_and_alignment() {
        let face = |align| framing([0.0, 20.0, 100.0, 50.0], align);
        let fit = |align, padding| fit_framing(face(align), [400.0, 400.0], padding);
        assert_eq!(fit([0.5, 0.5], 0.0).offset, [0.0, 20.0]);
        assert_eq!(fit([0.5, 0.5], 0.0).scale, 4.0);
        assert_eq!(fit([0.5, 0.0], 0.0).offset, [0.0, -80.0]);
        assert_eq!(fit([0.5, 1.0], 0.0).offset, [0.0, 120.0]);
        let padded = fit([0.0, 0.0], 0.25);
        let scale = 400.0 / 150.0;
        assert_eq!(padded.scale, scale);
        assert!((padded.offset[0] - 25.0 * scale).abs() < 1e-12);
        assert!((padded.offset[1] - (12.5 - 20.0) * scale).abs() < 1e-12);
    }
}
