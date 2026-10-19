"""Export a local official Laya checkpoint to the FP32 bundle consumed by prepare.py."""
import argparse
import json
from pathlib import Path
import shutil

import numpy as np
import onnxruntime as runtime
import torch
from laya.common import build_model, build_sequence
from safetensors.torch import load_file
from transformers import AutoTokenizer


class Wrapper(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.m = model

    def forward(self, input_ids, attention_mask, marker_pos, marker_mask, qtype):
        logits, act = self.m(input_ids, attention_mask, marker_pos, marker_mask, qtype)
        return logits, torch.softmax(act.float(), -1)


INPUTS = ("input_ids", "attention_mask", "marker_pos", "marker_mask", "qtype")


def make_inputs(tokenizer, config, examples):
    sequences = [build_sequence(tokenizer, state, question, config["max_len"], config["head_max_len"])
                 for state, question in examples]
    length = max(len(ids) for ids, _ in sequences)
    columns = max(len(markers) for _, markers in sequences)
    ids = torch.full((len(examples), length), tokenizer.pad_token_id, dtype=torch.int64)
    attention = torch.zeros_like(ids)
    positions = torch.zeros((len(examples), columns), dtype=torch.int64)
    masks = torch.zeros_like(positions, dtype=torch.bool)
    for row, (sequence, markers) in enumerate(sequences):
        ids[row, :len(sequence)] = torch.tensor(sequence)
        attention[row, :len(sequence)] = 1
        positions[row, :len(markers)] = torch.tensor(markers)
        masks[row, :len(markers)] = True
    types = torch.tensor([{"choice": 0, "score": 1, "noul": 2}[q["t"]] for _, q in examples])
    return ids, attention, positions, masks, types


def verify_export(wrapper, tokenizer, config, path):
    question = {"t": "choice", "ins": "이 은행 고객의 요청을 분류하세요.",
                "crit": {"카드 분실·도난": "", "송금 실패": "", "개인정보 변경": ""}}
    cases = [
        [("돈을 이체하려고 했는데 되지 않았어요.", question)],
        [("지갑을 도둑맞았어요. 사용을 막아 주세요.", question),
         ("새집으로 이사했어요. 등록된 주소를 바꾸고 싶어요.", question)],
        [("처리가 중단돼요. " * 30, question),
         ("긴급합니다.", {"t": "score", "ins": "긴급도를 판단하세요.", "crit": ["낮음", "높음"]}),
         ("My wallet was stolen.", {"t": "noul", "ins": "Was something stolen?"})],
    ]
    session = runtime.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    differences = []
    for examples in cases:
        inputs = make_inputs(tokenizer, config, examples)
        with torch.no_grad():
            expected = wrapper(*inputs)
        actual = session.run(None, {name: value.numpy() for name, value in zip(INPUTS, inputs)})
        for reference, output in zip(expected, actual):
            np.testing.assert_allclose(output, reference.numpy(), atol=2e-4, rtol=2e-4)
        differences.append(float(np.abs(actual[0] - expected[0].numpy()).max()))
    return max(differences)


def export_checkpoint(source, output):
    config = json.loads((source / "rl_agent_config.json").read_text())
    model = build_model(config, encoder_dir=str(source / "encoder"))
    model.load_state_dict(load_file(source / "model.safetensors"), strict=True)
    model.eval()
    model.encoder.config.reference_compile = False
    wrapper = Wrapper(model).eval()
    tokenizer = AutoTokenizer.from_pretrained(source / "tokenizer", local_files_only=True)
    output.mkdir(parents=True, exist_ok=True)
    inputs = (torch.randint(5, 1000, (2, 40)), torch.ones((2, 40), dtype=torch.int64),
              torch.tensor([[3, 9, 15, 21], [3, 9, 0, 0]]),
              torch.tensor([[True, True, True, True], [True, True, False, False]]), torch.tensor([0, 2]))
    inputs[1][1, 30:] = 0
    batch = torch.export.Dim("batch")
    sequence = torch.export.Dim("sequence", min=8)
    options = torch.export.Dim("options", min=2)
    path = output / "laya.onnx"
    program = torch.onnx.export(
        wrapper, inputs, opset_version=18, dynamo=True, optimize=True,
        input_names=list(INPUTS), output_names=["logits", "act_probs"],
        dynamic_shapes={"input_ids": {0: batch, 1: sequence},
                        "attention_mask": {0: batch, 1: sequence},
                        "marker_pos": {0: batch, 1: options},
                        "marker_mask": {0: batch, 1: options}, "qtype": {0: batch}},
    )
    program.save(path, external_data=True)
    shutil.copytree(source / "tokenizer", output / "tokenizer", dirs_exist_ok=True)
    (output / "laya_config.json").write_text(json.dumps(
        {key: config[key] for key in ("max_len", "head_max_len", "temperature", "temperature_by_options")},
        indent=2))
    difference = verify_export(wrapper, tokenizer, config, path)
    report = {"maxLogitDifference": difference, "cases": 3, "encoder": config["encoder"],
              "torch": torch.__version__, "precision": "float32"}
    (output / "verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    export_checkpoint(arguments.source, arguments.output)
