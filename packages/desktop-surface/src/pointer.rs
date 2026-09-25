use crate::model::{BackgroundMouseEventKind, ValidatedBackgroundMouseEvent};

pub(crate) fn website_mouse_event_script(event: &ValidatedBackgroundMouseEvent) -> String {
    let kind = match event.kind {
        BackgroundMouseEventKind::Down => "down",
        BackgroundMouseEventKind::Up => "up",
        BackgroundMouseEventKind::Dragged => "dragged",
        BackgroundMouseEventKind::Moved => "moved",
        BackgroundMouseEventKind::Left => "left",
        BackgroundMouseEventKind::Cancelled => "cancelled",
        BackgroundMouseEventKind::Wheel => "wheel",
    };

    format!(
        r#"
(() => {{
  const x = {x};
  const y = {y};
  const button = {button};
  const buttons = {buttons};
  const clickCount = {click_count};
  const modifiers = {{
    altKey: {alt_key},
    ctrlKey: {ctrl_key},
    metaKey: {meta_key},
    shiftKey: {shift_key},
  }};
  const stateKey = '__pomoDesktopMouseState';
  const state = window[stateKey] || (window[stateKey] = {{}});
  const hit = document.elementFromPoint(x, y);
  const common = {{
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    composed: true,
    detail: clickCount,
    view: window,
    ...modifiers,
  }};
  const dispatchHoverChange = (target) => {{
    const previous = state.hoverTarget;
    if (previous === target) return;
    if (previous) {{
      dispatchPointer('pointerout', previous, {{button: -1, buttons: 0, relatedTarget: target}});
      dispatchMouse('mouseout', previous, {{button: -1, buttons: 0, relatedTarget: target}});
      dispatchPointer('pointerleave', previous, {{button: -1, buttons: 0, relatedTarget: target}});
      dispatchMouse('mouseleave', previous, {{button: -1, buttons: 0, relatedTarget: target}});
    }}
    if (target) {{
      dispatchPointer('pointerover', target, {{button: -1, buttons: 0, relatedTarget: previous}});
      dispatchMouse('mouseover', target, {{button: -1, buttons: 0, relatedTarget: previous}});
      dispatchPointer('pointerenter', target, {{button: -1, buttons: 0, relatedTarget: previous}});
      dispatchMouse('mouseenter', target, {{button: -1, buttons: 0, relatedTarget: previous}});
    }}
    state.hoverTarget = target;
  }};

  const dispatchMouse = (type, target, overrides = {{}}) =>
    target.dispatchEvent(new MouseEvent(type, {{...common, ...overrides}}));
  const dispatchPointer = (type, target, overrides = {{}}) => {{
    if (typeof PointerEvent !== 'function') return;
    target.dispatchEvent(
      new PointerEvent(type, {{
        ...common,
        ...overrides,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
      }}),
    );
  }};

  if ('{kind}' === 'down') {{
    if (!hit) return;
    state.target = hit;
    state.x = x;
    state.y = y;
    state.dragged = false;
    state.button = button;
    dispatchHoverChange(hit);
    dispatchPointer('pointerdown', hit, {{button, buttons}});
    dispatchMouse('mousedown', hit, {{button, buttons}});
    if (hit instanceof HTMLElement) hit.focus({{preventScroll: true}});
    return;
  }}

  const target = hit || state.target;

  if ('{kind}' === 'moved') {{
    dispatchHoverChange(hit);
    if (!hit) return;
    dispatchPointer('pointermove', hit, {{button: -1, buttons: 0}});
    dispatchMouse('mousemove', hit, {{button: -1, buttons: 0}});
    return;
  }}

  if ('{kind}' === 'left') {{
    dispatchHoverChange(null);
    delete window[stateKey];
    return;
  }}

  if ('{kind}' === 'cancelled') {{
    if (target) dispatchPointer('pointercancel', target, {{button, buttons: 0}});
    delete window[stateKey];
    return;
  }}

  if ('{kind}' === 'wheel') {{
    dispatchHoverChange(hit);
    if (!hit || typeof WheelEvent !== 'function') return;
    hit.dispatchEvent(new WheelEvent('wheel', {{
      ...common,
      deltaMode: {delta_mode},
      deltaX: {delta_x},
      deltaY: {delta_y},
      deltaZ: {delta_z},
    }}));
    return;
  }}

  if (!target) return;

  if ('{kind}' === 'dragged') {{
    if (state.target && Math.hypot(x - state.x, y - state.y) > 4) state.dragged = true;
    dispatchPointer('pointermove', target, {{button, buttons}});
    dispatchMouse('mousemove', target, {{button, buttons}});
    return;
  }}

  const clickTarget = state.target || target;
  dispatchPointer('pointerup', target, {{button, buttons: 0}});
  dispatchMouse('mouseup', target, {{button, buttons: 0}});
  if (!state.dragged && button === 0) {{
    dispatchMouse('click', clickTarget, {{button: 0, buttons: 0}});
    if (clickCount >= 2) {{
      dispatchMouse('dblclick', clickTarget, {{button: 0, buttons: 0}});
    }}
  }} else if (button === 1) {{
    dispatchMouse('auxclick', clickTarget, {{button: 1, buttons: 0}});
  }} else if (button === 2) {{
    dispatchMouse('contextmenu', clickTarget, {{button: 2, buttons: 0}});
  }}
  state.target = null;
  state.dragged = false;
}})()
"#,
        alt_key = event.alt_key,
        button = event.button,
        buttons = event.buttons,
        click_count = event.click_count,
        ctrl_key = event.ctrl_key,
        delta_mode = event.delta_mode.unwrap_or(0),
        delta_x = event.delta_x.unwrap_or(0.0),
        delta_y = event.delta_y.unwrap_or(0.0),
        delta_z = event.delta_z.unwrap_or(0.0),
        kind = kind,
        meta_key = event.meta_key,
        shift_key = event.shift_key,
        x = event.x,
        y = event.y,
    )
}
