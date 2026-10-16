"""Numerical contract checks for the same forward/backward graph used in the browser."""
import unittest
import numpy as np
import onnxruntime as runtime
from scorer import build_scorer, PARAMETERS, parameter_shapes


class ScorerTest(unittest.TestCase):
    def setUp(self):
        self.session = runtime.InferenceSession(build_scorer(4).SerializeToString(), providers=["CPUExecutionProvider"])
        random = np.random.default_rng(12)
        self.feeds = {name: random.normal(0, 0.3, shape).astype(np.float32)
                      for name, shape in zip(PARAMETERS, parameter_shapes(4))}
        self.feeds["norm_scale"] = np.ones(4, np.float32)
        self.feeds.update(features=random.normal(size=(2, 3, 4)).astype(np.float32),
                          marker_mask=np.array([[1, 1, 1], [1, 1, 0]], dtype=bool),
                          targets=np.array([[0, 0.3, 0.7], [1, 0, 0]], np.float32),
                          temperature=np.array([[0.8], [1.3]], np.float32), learning_rate=np.array(0.1, np.float32))

    def test_gradients_match_finite_differences_for_every_parameter(self):
        outputs = dict(zip([output.name for output in self.session.get_outputs()], self.session.run(None, self.feeds)))
        delta = 1e-3
        for name in PARAMETERS:
            gradient = (self.feeds[name] - outputs["next_" + name]) / self.feeds["learning_rate"]
            for index in np.ndindex(self.feeds[name].shape):
                plus, minus = self.feeds[name].copy(), self.feeds[name].copy()
                plus[index] += delta
                minus[index] -= delta
                upper = self.session.run(["loss"], {**self.feeds, name: plus})[0]
                lower = self.session.run(["loss"], {**self.feeds, name: minus})[0]
                self.assertAlmostEqual(float(gradient[index]), float((upper - lower) / (2 * delta)), delta=2e-4)

    def test_sgd_reduces_loss_and_keeps_padding_masked(self):
        losses = []
        for _ in range(30):
            outputs = dict(zip([output.name for output in self.session.get_outputs()], self.session.run(None, self.feeds)))
            losses.append(float(outputs["loss"]))
            self.feeds.update({name: outputs["next_" + name] for name in PARAMETERS})
        self.assertLess(losses[-1], losses[0])
        self.assertEqual(outputs["logits"][1, 2], -1e4)


if __name__ == "__main__":
    unittest.main()
