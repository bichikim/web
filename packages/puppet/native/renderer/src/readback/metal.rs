use objc2::Message;
use objc2_metal::{MTLCommandBuffer, MTLCommandBufferStatus};

use super::{map, map_after};

pub(crate) async fn submit_and_map(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    commands: wgpu::CommandBuffer,
    buffer: &wgpu::Buffer,
    size: u64,
) -> Result<(), String> {
    let mut tail = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
        label: Some("Poffo geometry completion"),
    });
    // Take an owning reference to the empty trailing command buffer. wgpu still ends,
    // submits and tracks it, and the raw encoder is untouched outside this callback.
    let completion = unsafe {
        tail.as_hal_mut::<wgpu::hal::api::Metal, _, _>(|encoder| {
            encoder
                .and_then(|encoder| encoder.raw_command_buffer())
                .map(Message::retain)
        })
    };
    let slice = buffer.slice(0..size);
    let Some(completion) = completion else {
        queue.submit([commands]);
        return map(device, &slice).await;
    };

    let submission = queue.submit([commands, tail.finish()]);
    // The tail is also wgpu's submission fence. Waiting on Metal avoids the backend's
    // one-millisecond polling interval and never waits on a later submission.
    completion.waitUntilCompleted();
    if completion.status() != MTLCommandBufferStatus::Completed {
        return Err(format!(
            "Metal geometry submission failed: {:?}",
            completion.error()
        ));
    }

    // Metal has already signalled this fence. wgpu only needs to deliver the mapping,
    // which another active poll may already have taken ownership of.
    let result = map_after(
        device,
        &slice,
        wgpu::PollType::Wait {
            submission_index: Some(submission),
            timeout: None,
        },
    );
    if result.is_err() {
        buffer.unmap();
    }
    result
}
