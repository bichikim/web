use serde::Deserialize;

const MAXIMUM_EDGE: u16 = 512;

#[derive(Clone, Deserialize)]
pub(crate) struct HitMask {
    pub(crate) width: u16,
    pub(crate) height: u16,
    pub(crate) runs: Vec<[u16; 3]>,
}

impl HitMask {
    pub(crate) fn validate(&self) -> Result<(), String> {
        if self.width == 0
            || self.height == 0
            || self.width > MAXIMUM_EDGE
            || self.height > MAXIMUM_EDGE
        {
            return Err("Invalid widget hit mask dimensions".to_owned());
        }
        if self.runs.len() > usize::from(self.width) * usize::from(self.height) {
            return Err("Widget hit mask is too large".to_owned());
        }
        let mut previous = None;
        for &[row, start, end] in &self.runs {
            if row >= self.height || start >= end || end > self.width {
                return Err("Invalid widget hit mask span".to_owned());
            }
            if previous.is_some_and(|(prior_row, prior_end)| {
                row < prior_row || (row == prior_row && start < prior_end)
            }) {
                return Err("Widget hit mask spans must be ordered and disjoint".to_owned());
            }
            previous = Some((row, end));
        }
        Ok(())
    }

    pub(crate) fn contains(&self, x: f64, y: f64, width: f64, height: f64) -> bool {
        if !x.is_finite()
            || !y.is_finite()
            || x < 0.0
            || y < 0.0
            || x >= width
            || y >= height
            || width <= 0.0
            || height <= 0.0
        {
            return false;
        }
        let column = (x / width * f64::from(self.width)).floor() as u16;
        let row = (y / height * f64::from(self.height)).floor() as u16;
        let offset = self.runs.partition_point(|run| run[0] < row);
        self.runs[offset..]
            .iter()
            .take_while(|run| run[0] == row)
            .any(|run| column >= run[1] && column < run[2])
    }
}

#[cfg(test)]
mod tests {
    use super::HitMask;

    #[test]
    fn distinguishes_alpha_holes_from_character_spans_at_scaled_sizes() {
        let mask = HitMask {
            width: 4,
            height: 2,
            runs: vec![[0, 1, 3], [1, 0, 1], [1, 3, 4]],
        };
        assert!(mask.validate().is_ok());
        assert!(!mask.contains(5.0, 5.0, 40.0, 20.0));
        assert!(mask.contains(15.0, 5.0, 40.0, 20.0));
        assert!(!mask.contains(20.0, 15.0, 40.0, 20.0));
        assert!(mask.contains(35.0, 15.0, 40.0, 20.0));
        assert!(!mask.contains(40.0, 15.0, 40.0, 20.0));
        assert!(!mask.contains(-1.0, 5.0, 40.0, 20.0));
    }

    #[test]
    fn rejects_unordered_or_out_of_bounds_spans() {
        assert!(
            HitMask {
                width: 4,
                height: 2,
                runs: vec![[0, 3, 5]]
            }
            .validate()
            .is_err()
        );
        assert!(
            HitMask {
                width: 4,
                height: 2,
                runs: vec![[1, 0, 2], [0, 0, 1]]
            }
            .validate()
            .is_err()
        );
        assert!(
            HitMask {
                width: 4,
                height: 2,
                runs: vec![[0, 0, 3], [0, 2, 4]]
            }
            .validate()
            .is_err()
        );
    }
}
