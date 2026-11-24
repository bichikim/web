use serde::de::DeserializeOwned;
use tauri::ipc::{InvokeBody, Request};

/// A little-endian length, a UTF-8 JSON header and the remaining raw attachment bytes.
pub(super) fn read<T: DeserializeOwned>(request: &Request<'_>) -> Result<(T, Vec<u8>), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Native commands require binary IPC".into());
    };
    let prefix = bytes.get(..4).ok_or("Missing native packet length")?;
    let end = 4 + u32::from_le_bytes(prefix.try_into().unwrap()) as usize;
    let header = bytes.get(4..end).ok_or("Truncated native packet")?;
    Ok((
        serde_json::from_slice(header).map_err(|error| error.to_string())?,
        bytes[end..].to_vec(),
    ))
}

pub(super) fn floats(bytes: &[u8]) -> Result<Vec<f32>, String> {
    if !bytes.len().is_multiple_of(4) {
        return Err("Incomplete native draw data".into());
    }
    Ok(bytes
        .chunks_exact(4)
        .map(|x| f32::from_le_bytes(x.try_into().unwrap()))
        .collect())
}

pub(super) fn response(
    json: &[u8],
    frame: Option<u32>,
    coordinates: &[u8],
    parts: &[f64],
    layers: &[f64],
) -> Vec<u8> {
    let header = [
        json.len() as u32,
        frame.unwrap_or(0),
        (coordinates.len() / 4) as u32,
        parts.len() as u32,
        layers.len() as u32,
    ];
    let aligned = (std::mem::size_of_val(&header) + json.len()).next_multiple_of(8);
    let mut buffer = Vec::with_capacity(
        aligned
            + std::mem::size_of_val(coordinates)
            + std::mem::size_of_val(parts)
            + std::mem::size_of_val(layers),
    );
    buffer.extend(bytemuck::cast_slice::<_, u8>(&header));
    buffer.extend_from_slice(json);
    buffer.resize(aligned, 0);
    buffer.extend_from_slice(coordinates);
    buffer.extend_from_slice(bytemuck::cast_slice(parts));
    buffer.extend_from_slice(bytemuck::cast_slice(layers));
    buffer
}
