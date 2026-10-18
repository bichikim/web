"""Compare the original Laya logits to frozen features plus the generated scorer."""
import argparse
import json
from pathlib import Path
import numpy as np
import onnxruntime as runtime
from scorer import PARAMETERS, parameter_shapes


def compare(bundle, prepared):
    random = np.random.default_rng(51)
    inputs = {
        "input_ids": random.integers(5, 1000, (2, 32), dtype=np.int64),
        "attention_mask": np.ones((2, 32), np.int64),
        "marker_pos": np.array([[3, 9, 15], [3, 9, 0]], np.int64),
        "marker_mask": np.array([[1, 1, 1], [1, 1, 0]], dtype=bool),
        "qtype": np.array([0, 2], np.int64),
    }
    inputs["attention_mask"][1, 24:] = 0
    original = runtime.InferenceSession(str(bundle / "laya.onnx"), providers=["CPUExecutionProvider"])
    expected = original.run(["logits"], inputs)[0]
    del original
    features = runtime.InferenceSession(str(prepared / "features.onnx"), providers=["CPUExecutionProvider"])
    embeddings = features.run(None, {item.name: inputs[item.name] for item in features.get_inputs()})[0]
    del features
    manifest = json.loads((prepared / "manifest.json").read_text())
    parameters = np.fromfile(prepared / "parameters.bin", dtype="<f4")
    feeds, offset = {}, 0
    for name, shape in zip(PARAMETERS, parameter_shapes(manifest["width"])):
        count = int(np.prod(shape))
        feeds[name] = parameters[offset:offset + count].reshape(shape)
        offset += count
    feeds.update(features=embeddings, marker_mask=inputs["marker_mask"],
                 targets=np.zeros((2, 3), np.float32), temperature=np.ones((2, 1), np.float32),
                 learning_rate=np.array(0, np.float32))
    scorer = runtime.InferenceSession(str(prepared / "scorer.onnx"), providers=["CPUExecutionProvider"])
    actual = scorer.run(["logits"], feeds)[0]
    np.testing.assert_allclose(actual, expected, atol=2e-5, rtol=1e-5)
    print(json.dumps({"maxLogitDifference": float(np.abs(actual - expected).max())}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--prepared", type=Path, required=True)
    options = parser.parse_args()
    compare(options.bundle, options.prepared)
