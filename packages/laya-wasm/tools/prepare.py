"""Split a receptron Laya ONNX bundle into a frozen feature model and a trainable scorer."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto
from scorer import build_scorer, parameter_shapes, PARAMETERS


def split_bundle(bundle, output):
    source = onnx.load(bundle / "laya.onnx", load_external_data=False)
    initializers = {item.name: item for item in source.graph.initializer}
    producers = {name: node for node in source.graph.node for name in node.output}
    # Require the reference scorer contract instead of guessing an unfamiliar graph.
    biases = [node for node in source.graph.node if node.op_type == "Add" and "m.scorer.3.bias" in node.input]
    if len(biases) != 1:
        raise ValueError("Expected the reference m.scorer.3 final projection")
    final = biases[0]
    projection = producers[final.input[0]]
    if projection.op_type != "MatMul":
        raise ValueError("Expected a MatMul final projection")
    gelu = producers[projection.input[0]]
    hidden = next((producers[name] for name in gelu.input if name in producers and producers[name].op_type == "Add"
                   and "m.scorer.1.bias" in producers[name].input), None)
    if hidden is None:
        raise ValueError("Expected exact GELU scorer activation")
    matrix = producers[hidden.input[0]]
    normalization = producers[matrix.input[0]]
    if normalization.op_type != "LayerNormalization":
        raise ValueError("Expected scorer LayerNormalization")
    feature = normalization.input[0]
    width = initializers[projection.input[1]].dims[0]
    epsilon = next((attribute.f for attribute in normalization.attribute if attribute.name == "epsilon"), 1e-5)
    names = [normalization.input[1], normalization.input[2], matrix.input[1], "m.scorer.1.bias",
             projection.input[1], "m.scorer.3.bias"]
    weights = []
    for name, dimensions in zip(names, parameter_shapes(width)):
        tensor = initializers[name]
        array = numpy_helper.to_array(tensor, base_dir=str(bundle)).astype("<f4")
        if list(array.shape) != dimensions:
            raise ValueError("Unsupported scorer shape: " + name)
        weights.append(array.reshape(-1))

    needed = {feature}
    kept = []
    for node in reversed(source.graph.node):
        if needed.intersection(node.output):
            kept.append(node)
            needed.update(node.input)
    selected = [item for item in source.graph.initializer if item.name in needed]
    inputs = [item for item in source.graph.input if item.name in needed]
    result = helper.make_tensor_value_info(feature, TensorProto.FLOAT, ["batch", "options", width])
    graph = helper.make_graph(list(reversed(kept)), "laya-features", inputs, [result], selected)
    features = helper.make_model(graph, opset_imports=source.opset_import, ir_version=source.ir_version)
    output.mkdir(parents=True, exist_ok=True)
    onnx.save_model(features, output / "features.onnx")
    locations = {entry.value for item in selected for entry in item.external_data if entry.key == "location"}
    for location in locations:
        path = Path(location)
        if path.is_absolute() or ".." in path.parts:
            raise ValueError("External data must be relative to the bundle")
        destination = output / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        if (bundle / path).resolve() != destination.resolve():
            shutil.copyfile(bundle / path, destination)
    onnx.save_model(build_scorer(width, epsilon), output / "scorer.onnx")
    parameters = np.concatenate(weights)
    parameters.tofile(output / "parameters.bin")
    shutil.copytree(bundle / "tokenizer", output / "tokenizer", dirs_exist_ok=True)
    config = json.loads((bundle / "laya_config.json").read_text())
    identity = hashlib.sha256((bundle / "laya.onnx").read_bytes())
    # Include the frozen external weights so checkpoints cannot cross different base encoders.
    for location in sorted(locations):
        with (bundle / location).open("rb") as handle:
            for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
                identity.update(block)
    identity.update(parameters.tobytes())
    identity.update(json.dumps(config, sort_keys=True).encode())
    manifest = {"version": 1, "modelId": identity.hexdigest(), "width": width,
                "featureOutput": feature, "externalData": sorted(locations), "config": config,
                "parameters": [{"name": name, "dimensions": shape} for name, shape in zip(PARAMETERS, parameter_shapes(width))]}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {output}: frozen features + {parameters.size:,} trainable scorer parameters")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    if arguments.bundle.resolve() == arguments.output.resolve():
        parser.error("Output must differ from the source bundle")
    split_bundle(arguments.bundle, arguments.output)
