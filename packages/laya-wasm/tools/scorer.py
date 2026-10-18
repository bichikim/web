"""Build the Laya scorer's forward and analytic SGD graph for ONNX Runtime WASM."""
import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

PARAMETERS = ("norm_scale", "norm_bias", "hidden_weight", "hidden_bias", "output_weight", "output_bias")


def parameter_shapes(width):
    return ([width], [width], [width, width], [width], [width, 1], [1])


def build_scorer(width, epsilon=1e-5):
    nodes, constants = [], []

    def constant(name, value, dtype=np.float32):
        constants.append(numpy_helper.from_array(np.asarray(value, dtype=dtype), name))
        return name

    def operation(kind, name, *inputs, **attributes):
        nodes.append(helper.make_node(kind, list(inputs), [name], name=name, **attributes))
        return name

    constant("flat_shape", [-1, width], np.int64)
    constant("column_shape", [-1, 1], np.int64)
    constant("last_axis", [-1], np.int64)
    constant("first_axis", [0], np.int64)
    constant("all_axes", [0, 1], np.int64)
    constant("zero", 0)
    constant("one", 1)
    constant("half", 0.5)
    constant("epsilon", epsilon)
    constant("sqrt_two", np.sqrt(2))
    constant("inverse_root", 1 / np.sqrt(2 * np.pi))
    constant("masked_value", -1e4)
    constant("batch_index", 0, np.int64)

    flat = operation("Reshape", "flat", "features", "flat_shape")
    mean = operation("ReduceMean", "mean", flat, "last_axis", keepdims=1)
    centered = operation("Sub", "centered", flat, mean)
    square = operation("Mul", "square", centered, centered)
    variance = operation("ReduceMean", "variance", square, "last_axis", keepdims=1)
    adjusted = operation("Add", "adjusted", variance, "epsilon")
    deviation = operation("Sqrt", "deviation", adjusted)
    normalized = operation("Div", "normalized", centered, deviation)
    scaled = operation("Mul", "scaled", normalized, "norm_scale")
    hidden_input = operation("Add", "hidden_input", scaled, "norm_bias")
    product = operation("MatMul", "hidden_product", hidden_input, "hidden_weight")
    activation = operation("Add", "activation", product, "hidden_bias")
    divided = operation("Div", "divided", activation, "sqrt_two")
    error = operation("Erf", "error", divided)
    shifted = operation("Add", "shifted", error, "one")
    gate = operation("Mul", "gate", shifted, "half")
    hidden = operation("Mul", "hidden", activation, gate)
    projection = operation("MatMul", "projection", hidden, "output_weight")
    biased = operation("Add", "biased", projection, "output_bias")
    shape = operation("Shape", "option_shape", "marker_mask")
    reshaped = operation("Reshape", "reshaped", biased, shape)
    operation("Where", "logits", "marker_mask", reshaped, "masked_value")
    calibrated = operation("Div", "calibrated", "logits", "temperature")
    probabilities = operation("Softmax", "probabilities", calibrated, axis=-1)
    logarithms = operation("LogSoftmax", "logarithms", calibrated, axis=-1)
    likelihood = operation("Mul", "likelihood", logarithms, "targets")
    summed = operation("ReduceSum", "summed", likelihood, "all_axes", keepdims=0)
    batch = operation("Gather", "batch", shape, "batch_index", axis=0)
    count = operation("Cast", "count", batch, to=TensorProto.FLOAT)
    negative = operation("Neg", "negative", summed)
    operation("Div", "loss", negative, count)

    difference = operation("Sub", "difference", probabilities, "targets")
    valid = operation("Where", "valid", "marker_mask", difference, "zero")
    cooled = operation("Div", "cooled", valid, "temperature")
    averaged = operation("Div", "averaged", cooled, count)
    gradient = operation("Reshape", "gradient", averaged, "column_shape")
    transpose = operation("Transpose", "hidden_transpose", hidden, perm=[1, 0])
    output_gradient = operation("MatMul", "output_gradient", transpose, gradient)
    output_bias = operation("ReduceSum", "output_bias_gradient", gradient, "first_axis", keepdims=0)
    weights = operation("Transpose", "output_transpose", "output_weight", perm=[1, 0])
    hidden_gradient = operation("MatMul", "hidden_gradient", gradient, weights)
    activation_square = operation("Mul", "activation_square", activation, activation)
    exponent = operation("Mul", "exponent", activation_square, "half")
    negated = operation("Neg", "negated", exponent)
    density = operation("Exp", "density", negated)
    density_scaled = operation("Mul", "density_scaled", density, "inverse_root")
    derivative_term = operation("Mul", "derivative_term", activation, density_scaled)
    derivative = operation("Add", "derivative", gate, derivative_term)
    activation_gradient = operation("Mul", "activation_gradient", hidden_gradient, derivative)
    input_transpose = operation("Transpose", "input_transpose", hidden_input, perm=[1, 0])
    hidden_weight = operation("MatMul", "hidden_weight_gradient", input_transpose, activation_gradient)
    hidden_bias = operation("ReduceSum", "hidden_bias_gradient", activation_gradient, "first_axis", keepdims=0)
    weight_transpose = operation("Transpose", "weight_transpose", "hidden_weight", perm=[1, 0])
    input_gradient = operation("MatMul", "input_gradient", activation_gradient, weight_transpose)
    scale_gradient = operation("Mul", "scale_gradient", input_gradient, normalized)
    norm_scale = operation("ReduceSum", "norm_scale_gradient", scale_gradient, "first_axis", keepdims=0)
    norm_bias = operation("ReduceSum", "norm_bias_gradient", input_gradient, "first_axis", keepdims=0)
    gradients = (norm_scale, norm_bias, hidden_weight, hidden_bias, output_gradient, output_bias)
    for parameter, parameter_gradient in zip(PARAMETERS, gradients):
        update = operation("Mul", parameter + "_update", parameter_gradient, "learning_rate")
        operation("Sub", "next_" + parameter, parameter, update)

    value = lambda name, kind, dimensions: helper.make_tensor_value_info(name, kind, dimensions)
    shapes = parameter_shapes(width)
    inputs = [value("features", TensorProto.FLOAT, ["batch", "options", width]),
              value("marker_mask", TensorProto.BOOL, ["batch", "options"]),
              value("targets", TensorProto.FLOAT, ["batch", "options"]),
              value("temperature", TensorProto.FLOAT, ["batch", 1]),
              value("learning_rate", TensorProto.FLOAT, [])]
    inputs += [value(name, TensorProto.FLOAT, dimensions) for name, dimensions in zip(PARAMETERS, shapes)]
    outputs = [value("logits", TensorProto.FLOAT, ["batch", "options"]), value("loss", TensorProto.FLOAT, [])]
    outputs += [value("next_" + name, TensorProto.FLOAT, dimensions) for name, dimensions in zip(PARAMETERS, shapes)]
    model = helper.make_model(helper.make_graph(nodes, "laya-scorer-sgd", inputs, outputs, constants),
                              opset_imports=[helper.make_opsetid("", 18)], ir_version=9)
    onnx.checker.check_model(model)
    return model
