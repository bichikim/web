//! Checkpoint initialization, restoration, and input adjustment for playback.
use super::{WorkerError, WorkerRuntime, json::normalize, map, undefined};
use crate::{Completions, Player};
use serde_json::{Value, json};

impl Player {
    pub(super) fn initial_worker(&mut self) -> Result<(), WorkerError> {
        self.worker_state = json!({"additional":[],"notices":{"pending":[],"sequence":0},"adjustments":{"blends":{"before-physics":map(vec![]),"after-physics":map(vec![]),"interaction":map(vec![])},"physicsOptions":undefined()},"parameterValues":{},"renderOverrides":{"parts":map(vec![]),"groups":map(vec![])},"modelOpacity":1,"physicsPreview":true,"eyeBlinkTiming":serde_json::to_value(crate::EyeBlinkTiming::default()).map_err(WorkerError::Json)?,"lipSyncLevel":undefined(),"voiceTarget":undefined(),"playback":{"completion":undefined()},"history":{"frames":[],"base":{},"values":{}}});
        self.update_worker_state(&Completions::default(), 0)?;
        Ok(())
    }
}

impl WorkerRuntime {
    pub(super) fn reset_checkpoint(&mut self, message: &mut Value) -> Result<(), WorkerError> {
        self.checkpoint_id = None;
        self.player
            .as_mut()
            .ok_or(WorkerError::Uninitialized)?
            .restore_worker(message["state"].take())?;
        self.generation = message["generation"].as_u64().unwrap_or(0);
        self.revision = message["inputRevision"].as_u64().unwrap_or(0);
        Ok(())
    }
}

pub(super) fn restore_frame_input(
    player: &mut Player,
    checkpoint_id: Option<u64>,
    revision: &mut u64,
    input: &mut Value,
) -> Result<(), WorkerError> {
    if !input.is_null() {
        let state = if let Some(base) = input["checkpointId"].as_u64() {
            if checkpoint_id != Some(base) {
                return Err(WorkerError::Checkpoint("Checkpoint has advanced".into()));
            }
            let mut state = std::mem::take(&mut player.worker_state);
            normalize(&mut state, &[]);
            state["adjustments"] = input["adjustments"].take();
            state
        } else {
            input["state"].take()
        };
        player.restore_worker(state)?;
        *revision = input["revision"].as_u64().unwrap_or(0);
        if input["settle"] == true {
            let deferred = player.deferred.take();
            player.settle_worker();
            player.deferred = deferred;
        }
    }
    Ok(())
}

#[cfg(test)]
mod checkpoint_tests {
    use super::*;

    fn process(worker: &mut WorkerRuntime, input: Value) -> Value {
        let output = worker.process_packed_json(&serde_json::to_vec(&input).unwrap(), &[]);
        let response: Value = serde_json::from_slice(&output).unwrap();
        assert_ne!(response["kind"], "error", "{response}");
        response
    }

    #[test]
    fn adjustments_from_latest_checkpoint_match_full_restore() {
        let initialize = json!({"kind":"initialize","id":1,"document":{
            "format":"winter-love-poffo","version":1,"viewport":{"width":1,"height":1},
            "parameters":[{"id":"gaze","name":"Gaze","minimum":-1,"maximum":1,"defaultValue":0}],
            "parts":[],"motions":[]
        }});
        let produce =
            json!({"id":2,"kind":"produce","request":{"generation":0,"deltaTime":0.016,"time":16}});
        let mut compact = WorkerRuntime::default();
        let mut full = WorkerRuntime::default();
        process(&mut compact, initialize.clone());
        process(&mut full, initialize);
        process(&mut compact, produce.clone());
        let mut state = process(&mut full, produce)["frame"]["state"].take();
        state["adjustments"]["blends"]["before-physics"] =
            map(vec![json!(["gaze",{"mode":"add","value":0.32,"weight":1}])]);
        let send = |input| {
            json!({"id":3,"kind":"produce","request":{
                "generation":0,"deltaTime":0.012,"time":28,"input":input
            }})
        };
        let checkpoint = json!({"checkpointId":2,"adjustments":state["adjustments"],"revision":1});
        let compact_response = process(&mut compact, send(checkpoint));
        let full_response = process(&mut full, send(json!({"state":state,"revision":1})));
        assert_eq!(compact_response, full_response);
        assert_eq!(
            compact_response["frame"]["computed"]["parameterValues"]["gaze"],
            0.32
        );
    }
}
