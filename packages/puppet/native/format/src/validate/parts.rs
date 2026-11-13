//! Part shape rules: texture, mesh, render properties and spatial surface.

use super::{Check, Effect, ensure, non_empty_unique};
use crate::document::{Mesh, Part, PartRenderProperties, SpatialSurface, ValidationSpace};

fn validate_mesh(mesh: &Mesh, path: &str) -> Check {
    let vertex_count = mesh.vertex_count();
    // A compiled mesh (`validationSpace: indices`) without triangles may keep fewer than three
    // vertices: it draws nothing but stays addressable by glue and motions (`isMesh`).
    let drawless =
        mesh.validation_space == Some(ValidationSpace::Indices) && mesh.indices.is_empty();
    ensure(
        mesh.vertices.len().is_multiple_of(2)
            && (vertex_count >= 3 || drawless)
            && mesh.uvs.len() == mesh.vertices.len(),
        || format!("{path}.mesh"),
        "needs at least three XY vertices with matching UVs",
    )?;
    ensure(
        mesh.indices.len().is_multiple_of(3)
            && mesh.indices.iter().all(|&i| (i as usize) < vertex_count),
        || format!("{path}.mesh.indices"),
        "must be whole triangles of existing vertices",
    )
}

fn validate_properties(properties: &PartRenderProperties, path: &str) -> Check {
    let effect = Effect::from(properties);
    ensure(
        effect.opacity_ok(false),
        || format!("{path}.opacity"),
        "must be 0..=1",
    )?;
    ensure(
        effect.draw_order_ok(false),
        || format!("{path}.drawOrder"),
        "must be 0..=1000",
    )?;
    ensure(
        effect.colors_ok(false),
        || format!("{path}.color"),
        "channels must be 0..=1",
    )?;
    ensure(
        properties
            .clipping_mask_ids
            .as_deref()
            .is_none_or(non_empty_unique),
        || format!("{path}.clippingMaskIds"),
        "must be unique, non-empty ids",
    )
}

fn validate_spatial(spatial: &SpatialSurface, vertex_count: usize, path: &str) -> Check {
    ensure(
        spatial.control_points.len() == vertex_count * 3,
        || format!("{path}.controlPoints"),
        "needs one XYZ triple per mesh vertex",
    )?;
    ensure(
        spatial.group_id.as_deref().is_none_or(|g| !g.is_empty()),
        || format!("{path}.groupId"),
        "must not be empty",
    )?;
    if let Some(attachments) = &spatial.attachments {
        ensure(
            attachments.len() == vertex_count,
            || format!("{path}.attachments"),
            "one per vertex",
        )?;
        for (index, attachment) in attachments.iter().enumerate() {
            let sum: f64 = attachment.weights.iter().sum();
            ensure(
                attachment.weights.iter().all(|&w| w >= -0.00001) && (sum - 1.0).abs() < 0.00001,
                || format!("{path}.attachments[{index}].weights"),
                "must be barycentric",
            )?;
        }
    }
    Ok(())
}

pub(super) fn validate_part(part: &Part, path: &str) -> Check {
    ensure(
        !part.id.is_empty(),
        || format!("{path}.id"),
        "must not be empty",
    )?;
    let texture = &part.texture;
    ensure(
        !texture.src.is_empty() && texture.width > 0 && texture.height > 0,
        || format!("{path}.texture"),
        "needs a source and positive size",
    )?;
    ensure(
        texture.region.is_none_or(|r| {
            r.width > 0
                && r.height > 0
                && u64::from(r.x) + u64::from(r.width) <= u64::from(texture.width)
                && u64::from(r.y) + u64::from(r.height) <= u64::from(texture.height)
        }),
        || format!("{path}.texture.region"),
        "must be a non-empty rectangle within the texture",
    )?;
    validate_mesh(&part.mesh, path)?;
    if let Some(properties) = &part.properties {
        validate_properties(properties, &format!("{path}.properties"))?;
    }
    if let Some(spatial) = &part.spatial {
        validate_spatial(
            spatial,
            part.mesh.vertex_count(),
            &format!("{path}.spatial"),
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use crate::validate::test_support::{accepts, document, merge, triangle};

    #[test]
    fn texture_regions_lie_within_their_texture() {
        let valid = |region: Value| {
            let texture = json!({"texture": {"src": "a.png", "width": 8, "height": 4,
                "region": region}});
            accepts(document(json!({"parts": [merge(triangle("a"), texture)]})))
        };
        assert!(valid(json!({"x": 4, "y": 0, "width": 4, "height": 4})));
        assert!(!valid(json!({"x": 5, "y": 0, "width": 4, "height": 4})));
        assert!(!valid(json!({"x": 0, "y": 0, "width": 0, "height": 4})));
        assert!(!valid(json!({"x": 0.5, "y": 0, "width": 4, "height": 4})));
    }
}
