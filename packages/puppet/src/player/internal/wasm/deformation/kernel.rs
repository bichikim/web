use core::arch::wasm32::{
    f64x2, f64x2_add, f64x2_extract_lane, f64x2_mul, f64x2_splat, f64x2_sub, v128, v128_load,
};

// Float64 operations intentionally follow the JavaScript evaluator's accumulation order.
#[derive(Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}

#[no_mangle]
pub extern "C" fn allocate(length: usize) -> *mut f64 {
    Box::into_raw(vec![0.0; length].into_boxed_slice()) as *mut f64
}

#[inline(always)]
unsafe fn read(pointer: usize, index: usize) -> f64 {
    *((pointer as *const f64).add(index))
}
#[inline(always)]
unsafe fn write(pointer: usize, index: usize, value: f64) {
    *((pointer as *mut f64).add(index)) = value;
}
#[inline(always)]
unsafe fn address(pointer: usize, index: usize) -> usize {
    read(pointer, index) as usize
}

#[inline(always)]
fn point(values: v128) -> Point {
    Point {
        x: f64x2_extract_lane::<0>(values),
        y: f64x2_extract_lane::<1>(values),
    }
}

#[inline(always)]
unsafe fn local_point(node: usize, coordinate: usize) -> Point {
    let rest_pointer = address(node, 9);
    let rest = v128_load((rest_pointer as *const f64).add(coordinate) as *const v128);
    let bindings = address(node, 10);
    let mut result = rest;
    for index in 0..address(node, 11) {
        let binding = address(bindings, index);
        let count = address(binding, 0);
        if count > 0 {
            let samples = address(binding, 2);
            let origin =
                v128_load((address(samples, 0) as *const f64).add(coordinate) as *const v128);
            let mut value = origin;
            for corner in 0..count {
                let coordinates = v128_load(
                    (address(samples, corner * 2) as *const f64).add(coordinate) as *const v128,
                );
                let weight = f64x2_splat(read(samples, corner * 2 + 1));
                value = f64x2_add(value, f64x2_mul(f64x2_sub(coordinates, origin), weight));
            }
            result = f64x2_add(
                result,
                f64x2_mul(f64x2_sub(value, rest), f64x2_splat(read(binding, 1))),
            );
        }
    }
    point(result)
}

unsafe fn grid_point(node: usize, index: usize) -> Point {
    let versions = address(node, 13);
    let world = address(node, 12);
    let version = read(node, 14);
    if read(versions, index) != version {
        let input = local_point(node, index * 2);
        let parent = address(node, 1);
        let point = if parent == 0 {
            input
        } else {
            sample_node(parent, input)
        };
        write(world, index * 2, point.x);
        write(world, index * 2 + 1, point.y);
        write(versions, index, version);
    }
    Point {
        x: read(world, index * 2),
        y: read(world, index * 2 + 1),
    }
}

unsafe fn coordinate(node: usize, x: f64, y: f64) -> Point {
    let columns = address(node, 3);
    let rows = address(node, 2);
    if x >= 0.0 && x <= 1.0 && y >= 0.0 && y <= 1.0 {
        return grid_point(
            node,
            (y * rows as f64).round() as usize * (columns + 1)
                + (x * columns as f64).round() as usize,
        );
    }
    let a = grid_point(node, 0);
    let b = grid_point(node, columns);
    let c = grid_point(node, rows * (columns + 1));
    let d = grid_point(node, (rows + 1) * (columns + 1) - 1);
    Point {
        x: (a.x + b.x + c.x + d.x) / 4.0
            + (x - 0.5) * (b.x + d.x - a.x - c.x) / 2.0
            + (y - 0.5) * (c.x + d.x - a.x - b.x) / 2.0,
        y: (a.y + b.y + c.y + d.y) / 4.0
            + (x - 0.5) * (b.y + d.y - a.y - c.y) / 2.0
            + (y - 0.5) * (c.y + d.y - a.y - b.y) / 2.0,
    }
}

#[inline(always)]
fn cell(value: f64, divisions: usize) -> usize {
    if value < 0.0 {
        0
    } else if value > 1.0 {
        divisions + 1
    } else {
        ((value * divisions as f64).floor() as usize).min(divisions - 1) + 1
    }
}
#[inline(always)]
fn progress(value: f64, divisions: usize, cell: usize) -> f64 {
    if value < 0.0 {
        (value + 2.0) / 2.0
    } else if value > 1.0 {
        (value - 1.0) / 2.0
    } else {
        value * divisions as f64 - (cell - 1) as f64
    }
}
#[inline(always)]
fn start(cell: usize, divisions: usize) -> f64 {
    if cell == 0 {
        -2.0
    } else if cell == divisions + 1 {
        1.0
    } else {
        (cell - 1) as f64 / divisions as f64
    }
}
#[inline(always)]
fn end(cell: usize, divisions: usize) -> f64 {
    if cell == 0 {
        0.0
    } else if cell == divisions + 1 {
        3.0
    } else {
        cell as f64 / divisions as f64
    }
}
// Keep every lane's accumulation order identical to the scalar JavaScript formulas.
#[inline(always)]
fn interpolate(a: Point, b: Point, c: Point, d: Point, x: f64, y: f64, mode: usize) -> Point {
    let a = f64x2(a.x, a.y);
    let b = f64x2(b.x, b.y);
    let c = f64x2(c.x, c.y);
    let d = f64x2(d.x, d.y);
    let horizontal = f64x2_splat(x);
    let vertical = f64x2_splat(y);
    let reverse_x = f64x2_splat(1.0 - x);
    let reverse_y = f64x2_splat(1.0 - y);
    point(match mode {
        0 => f64x2_add(
            f64x2_add(
                f64x2_add(
                    f64x2_mul(f64x2_mul(a, reverse_x), reverse_y),
                    f64x2_mul(f64x2_mul(b, horizontal), reverse_y),
                ),
                f64x2_mul(f64x2_mul(c, reverse_x), vertical),
            ),
            f64x2_mul(f64x2_mul(d, horizontal), vertical),
        ),
        2 => {
            if x >= y {
                f64x2_add(
                    f64x2_add(a, f64x2_mul(f64x2_sub(b, a), horizontal)),
                    f64x2_mul(f64x2_sub(d, b), vertical),
                )
            } else {
                f64x2_add(
                    f64x2_add(a, f64x2_mul(f64x2_sub(d, c), horizontal)),
                    f64x2_mul(f64x2_sub(c, a), vertical),
                )
            }
        }
        _ => {
            if x + y <= 1.0 {
                f64x2_add(
                    f64x2_add(a, f64x2_mul(f64x2_sub(b, a), horizontal)),
                    f64x2_mul(f64x2_sub(c, a), vertical),
                )
            } else {
                f64x2_add(
                    f64x2_add(d, f64x2_mul(f64x2_sub(c, d), reverse_x)),
                    f64x2_mul(f64x2_sub(b, d), reverse_y),
                )
            }
        }
    })
}

#[derive(Clone, Copy)]
struct SamplingCell {
    index: Option<usize>,
    horizontal: f64,
    vertical: f64,
    left: f64,
    right: f64,
    top: f64,
    bottom: f64,
}

#[inline(always)]
unsafe fn prepare_cell(node: usize, point: Point) -> SamplingCell {
    let horizontal = (point.x - read(node, 4)) / read(node, 6);
    let vertical = (point.y - read(node, 5)) / read(node, 7);
    let columns = address(node, 3);
    let rows = address(node, 2);
    let column = cell(horizontal, columns);
    let row = cell(vertical, rows);
    let outside = column == 0 || column > columns || row == 0 || row > rows;
    SamplingCell {
        index: if outside {
            None
        } else {
            Some((row - 1) * (columns + 1) + column - 1)
        },
        horizontal: progress(horizontal, columns, column),
        vertical: progress(vertical, rows, row),
        left: if outside { start(column, columns) } else { 0.0 },
        right: if outside { end(column, columns) } else { 0.0 },
        top: if outside { start(row, rows) } else { 0.0 },
        bottom: if outside { end(row, rows) } else { 0.0 },
    }
}

#[inline(always)]
unsafe fn sample_cell(node: usize, point: Point, cell: SamplingCell) -> Point {
    let (a, b, c, d) = match cell.index {
        Some(index) => {
            let columns = address(node, 3);
            (
                grid_point(node, index),
                grid_point(node, index + 1),
                grid_point(node, index + columns + 1),
                grid_point(node, index + columns + 2),
            )
        }
        None => (
            coordinate(node, cell.left, cell.top),
            coordinate(node, cell.right, cell.top),
            coordinate(node, cell.left, cell.bottom),
            coordinate(node, cell.right, cell.bottom),
        ),
    };
    let output = interpolate(a, b, c, d, cell.horizontal, cell.vertical, address(node, 8));
    Point {
        x: point.x + (output.x - point.x) * 1.0,
        y: point.y + (output.y - point.y) * 1.0,
    }
}

#[inline(always)]
unsafe fn cached_cell(node: usize, point: Point, pointer: usize, changed: bool) -> SamplingCell {
    if changed || read(pointer, 0) == 0.0 {
        let cell = prepare_cell(node, point);
        write(pointer, 0, 1.0);
        write(pointer, 1, cell.index.map_or(-1.0, |index| index as f64));
        write(pointer, 2, cell.horizontal);
        write(pointer, 3, cell.vertical);
        write(pointer, 4, cell.left);
        write(pointer, 5, cell.right);
        write(pointer, 6, cell.top);
        write(pointer, 7, cell.bottom);
        cell
    } else {
        let index = read(pointer, 1);
        SamplingCell {
            index: if index < 0.0 {
                None
            } else {
                Some(index as usize)
            },
            horizontal: read(pointer, 2),
            vertical: read(pointer, 3),
            left: read(pointer, 4),
            right: read(pointer, 5),
            top: read(pointer, 6),
            bottom: read(pointer, 7),
        }
    }
}

unsafe fn sample_node(node: usize, point: Point) -> Point {
    if address(node, 0) == 1 {
        let data = address(node, 9);
        let horizontal = (point.x - read(data, 6)) * read(data, 12);
        let vertical = (point.y - read(data, 7)) * read(data, 13);
        let x = read(data, 8) + horizontal * read(data, 10) - vertical * read(data, 11);
        let y = read(data, 9) + horizontal * read(data, 11) + vertical * read(data, 10);
        let bone_x = point.x + (x - point.x) * 1.0;
        let bone_y = point.y + (y - point.y) * 1.0;
        let local_x = point.x + (bone_x - point.x) * 1.0;
        let local_y = point.y + (bone_y - point.y) * 1.0;
        let x = local_x - read(data, 0);
        let y = local_y - read(data, 1);
        return Point {
            x: read(data, 2) + x * read(data, 4) - y * read(data, 5),
            y: read(data, 3) + x * read(data, 5) + y * read(data, 4),
        };
    }
    sample_cell(node, point, prepare_cell(node, point))
}

#[no_mangle]
pub unsafe extern "C" fn sample(node: usize, x: f64, y: f64, output: usize) {
    let point = sample_node(node, Point { x, y });
    write(output, 0, point.x);
    write(output, 1, point.y);
}

#[no_mangle]
pub unsafe extern "C" fn map_vertices(node: usize, buffer: usize, length: usize, changed: bool) {
    let previous = buffer + length * 8;
    let output = previous + length * 8;
    let cells = output + length * 8;
    let rigid = address(node, 0) == 1;
    for index in (0..length).step_by(2) {
        let x = read(buffer, index);
        let y = read(buffer, index + 1);
        let input_changed = read(previous, index).to_bits() != x.to_bits()
            || read(previous, index + 1).to_bits() != y.to_bits();
        if changed || input_changed {
            write(previous, index, x);
            write(previous, index + 1, y);
            let input = Point { x, y };
            let point = if rigid {
                sample_node(node, input)
            } else {
                let cell = cached_cell(node, input, cells + index * 32, input_changed);
                sample_cell(node, input, cell)
            };
            write(output, index, point.x);
            write(output, index + 1, point.y);
        }
    }
}
