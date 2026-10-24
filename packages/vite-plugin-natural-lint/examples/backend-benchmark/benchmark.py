#!/usr/bin/env python3
"""Compare local typed-decision backends on one frozen JSONL dataset."""

import argparse
import importlib
import json
import math
import os
import re
import statistics
import time
from pathlib import Path


INSTRUCTION = (
    "Return true when one of candidateExports can replace a filename of more than "
    "three words without losing the responsibility named by the file and its "
    "exports. Use only candidateExports; do not invent or combine names. Do not "
    "return true merely because the filename has more than three words."
)


def read_cases(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def expected_calibration_error(rows, bins=10):
    total = len(rows)
    error = 0.0
    for index in range(bins):
        lower = index / bins
        upper = (index + 1) / bins
        selected = [
            row
            for row in rows
            if lower <= row["confidence"] < upper
            or (index == bins - 1 and row["confidence"] == 1.0)
        ]
        if selected:
            accuracy = sum(row["correct"] for row in selected) / len(selected)
            confidence = statistics.fmean(row["confidence"] for row in selected)
            error += len(selected) / total * abs(accuracy - confidence)
    return error


def summarize(rows, threshold):
    decided = [row for row in rows if row["probability"] >= threshold or row["probability"] <= 1 - threshold]
    true_positive = sum(row["expected"] and row["predicted"] for row in decided)
    false_positive = sum(not row["expected"] and row["predicted"] for row in decided)
    false_negative = sum(row["expected"] and not row["predicted"] for row in decided)
    correct = sum(row["correct"] for row in decided)
    precision_denominator = true_positive + false_positive
    recall_denominator = true_positive + false_negative
    return {
        "accuracy": correct / len(rows),
        "coverage": len(decided) / len(rows),
        "ece": expected_calibration_error(rows),
        "latencyMsMean": statistics.fmean(row["latencyMs"] for row in rows),
        "latencyMsP95": sorted(row["latencyMs"] for row in rows)[math.ceil(len(rows) * 0.95) - 1],
        "precision": None if precision_denominator == 0 else true_positive / precision_denominator,
        "recall": None if recall_denominator == 0 else true_positive / recall_denominator,
        "total": len(rows),
    }


def load_predictor(provider):
    if provider == "laya":
        laya = importlib.import_module("laya_coreml")
        model = os.environ.get("LAYA_MODEL", "aac6fef/laya-multilingual-coreml")
        revision = os.environ.get(
            "LAYA_MODEL_REVISION", "8139e9089273319512c730218903784074133187"
        )
        agent = laya.load(model, revision=revision)
        return lambda state: agent.predict(
            state, {"violation": {"type": "noul", "instructions": INSTRUCTION}}
        )["answers"]["violation"]["noul"]
    if provider == "von":
        von = importlib.import_module("von")
        return lambda state: float(von.judge(state=json.dumps(state), instructions=INSTRUCTION))
    if provider == "poorjev":
        poorjev = importlib.import_module("poorjev")
        client = poorjev.Client()

        def predict(state):
            answer = client.ask(
                state=json.dumps(state),
                questions={"violation": poorjev.Noul(INSTRUCTION)},
            )["violation"]
            probability = getattr(answer, "probability", None)
            if probability is None:
                probability = answer.confidence if answer.value else 1 - answer.confidence
            return float(probability)

        return predict
    raise ValueError(f"Unsupported provider: {provider}")


def identifier_words(value):
    separated = re.sub(r"([a-z\d])([A-Z])", r"\1-\2", value)
    return [word for word in re.split(r"[^a-z\d]+", separated.lower()) if word]


def inspect(state):
    filename_words = state["filename"].split("-")
    if any(identifier_words(name) == filename_words for name in state["exports"]):
        return 0.0
    if not state["candidateExports"]:
        return 0.0
    return None


def evaluate(cases, predictor, threshold):
    model_cases = [case for case in cases if inspect(case["state"]) is None]
    predictor(model_cases[0]["state"])
    rows = []
    for case in cases:
        probability = inspect(case["state"])
        latency_ms = 0.0
        source = "inspect"
        if probability is None:
            started = time.perf_counter()
            probability = predictor(case["state"])
            latency_ms = (time.perf_counter() - started) * 1000
            source = "model"
        expected = case["expected"] == "fail"
        predicted = probability >= 0.5
        confidence = probability if predicted else 1 - probability
        rows.append(
            {
                "confidence": confidence,
                "correct": predicted == expected,
                "expected": expected,
                "id": case["id"],
                "latencyMs": latency_ms,
                "predicted": predicted,
                "probability": probability,
                "source": source,
            }
        )
    model_rows = [row for row in rows if row["source"] == "model"]
    return {
        "modelMetrics": summarize(model_rows, threshold),
        "pipelineMetrics": summarize(rows, threshold),
        "rows": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", default=Path(__file__).with_name("cases.jsonl"))
    parser.add_argument("--provider", choices=["laya", "poorjev", "von"], required=True)
    parser.add_argument("--threshold", default=0.8, type=float)
    arguments = parser.parse_args()
    report = evaluate(read_cases(arguments.cases), load_predictor(arguments.provider), arguments.threshold)
    print(json.dumps({"provider": arguments.provider, **report}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
