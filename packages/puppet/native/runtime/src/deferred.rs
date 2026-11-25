//! Geometry batches owned by one numerical frame, with exact CPU corrections before glue.
use crate::{deform::projection::Projection, geometry::Vec2};

#[derive(Clone)]
pub(crate) struct Job {
    pub(crate) part: usize,
    pub(crate) start: usize,
    pub(crate) count: usize,
    pub(crate) projection: std::rc::Rc<Projection>,
}
#[derive(Default)]
pub(crate) struct DeferredGeometry {
    pub(crate) pending: bool,
    offsets: Vec<usize>,
    pub(crate) jobs: Vec<Job>,
    pub(crate) commands: Vec<u32>,
    pub(crate) values: Vec<f32>,
}
impl DeferredGeometry {
    pub(crate) fn begin(&mut self, lengths: impl Iterator<Item = usize>) {
        self.pending = true;
        if self.offsets.is_empty() {
            let mut offset = 0;
            self.offsets.extend(lengths.map(|length| {
                let start = offset;
                offset += length / 2;
                start
            }));
        }
        self.jobs.clear();
        self.commands.clear();
        self.values.clear();
    }
    pub(crate) fn push(
        &mut self,
        part: usize,
        points: &[f32],
        projection: &std::rc::Rc<Projection>,
    ) -> bool {
        if self.jobs.len() >= 65535 || !projection.accepts(points) {
            return false;
        }
        let start = self.offsets[part];
        let count = points.len() / 2;
        let (kind, values) = projection.packet();
        self.commands.extend([
            start as u32,
            count as u32,
            (self.values.len() / 4) as u32,
            kind,
        ]);
        self.values.extend(values.iter().flat_map(|&value| {
            let high = value as f32;
            let low = (value - f64::from(high)) as f32;
            let error = (value - (f64::from(high) + f64::from(low))).abs() * 2.;
            [high, low, error as f32, 0.]
        }));
        self.jobs.push(Job {
            part,
            start,
            count,
            projection: projection.clone(),
        });
        true
    }
    pub(crate) fn correct(
        &self,
        points: &[Vec<f32>],
        output: &mut [f32],
        indices: &[u32],
        all: bool,
    ) -> Result<(), String> {
        let correct = |job: &Job, index: usize, output: &mut [f32]| {
            let offset = (index - job.start) * 2;
            let point = job.projection.evaluate(Vec2::new(
                f64::from(points[job.part][offset]),
                f64::from(points[job.part][offset + 1]),
            ));
            output[index * 2] = point.x as f32;
            output[index * 2 + 1] = point.y as f32;
        };
        if all {
            for job in &self.jobs {
                for index in job.start..job.start + job.count {
                    correct(job, index, output);
                }
            }
        } else {
            for &index in indices {
                let index = index as usize;
                let job = self
                    .jobs
                    .iter()
                    .find(|job| (job.start..job.start + job.count).contains(&index))
                    .ok_or("Unknown geometry correction vertex")?;
                correct(job, index, output);
            }
        }
        Ok(())
    }
}
