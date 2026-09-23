import unittest

from benchmark import expected_calibration_error, inspect, summarize


class BenchmarkMetricsTest(unittest.TestCase):
    def test_should_report_perfect_decisions(self):
        rows = [
            {"confidence": 1.0, "correct": True, "expected": True, "latencyMs": 2, "predicted": True, "probability": 1.0},
            {"confidence": 1.0, "correct": True, "expected": False, "latencyMs": 4, "predicted": False, "probability": 0.0},
        ]
        self.assertEqual(
            summarize(rows, 0.8),
            {"accuracy": 1.0, "coverage": 1.0, "ece": 0.0, "latencyMsMean": 3.0, "latencyMsP95": 4, "precision": 1.0, "recall": 1.0, "total": 2},
        )

    def test_should_measure_calibration_error(self):
        rows = [
            {"confidence": 0.8, "correct": True},
            {"confidence": 0.8, "correct": False},
        ]
        self.assertAlmostEqual(expected_calibration_error(rows), 0.3)

    def test_should_skip_model_when_filename_matches_export(self):
        state = {
            "candidateExports": ["SwipeTrackGesture"],
            "exports": ["useSwipeTrackGesture", "SwipeTrackGesture"],
            "filename": "use-swipe-track-gesture",
        }
        self.assertEqual(inspect(state), 0.0)

    def test_should_request_model_for_short_filename_candidate(self):
        state = {
            "candidateExports": ["AutomaticDialogueSettings"],
            "exports": ["AutomaticDialogueSettings"],
            "filename": "automatic-dialogue-settings-contract",
        }
        self.assertIsNone(inspect(state))


if __name__ == "__main__":
    unittest.main()
