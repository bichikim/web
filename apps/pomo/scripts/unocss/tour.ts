export const tourStyles = `
.pomo-tour-mask {
  --tour-radius: min(1.25rem, calc(var(--target-width) / 2), calc(var(--target-height) / 2));
  -webkit-mask-image:
    linear-gradient(black, black), linear-gradient(black, black), linear-gradient(black, black),
    linear-gradient(black, black),
    radial-gradient(circle at 100% 100%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 0% 100%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 100% 0%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 0% 0%, transparent var(--tour-radius), black var(--tour-radius));
  -webkit-mask-position:
    0 0,
    0 var(--target-top),
    var(--target-right) var(--target-top),
    0 var(--target-bottom),
    var(--target-left) var(--target-top),
    calc(var(--target-right) - var(--tour-radius)) var(--target-top),
    var(--target-left) calc(var(--target-bottom) - var(--tour-radius)),
    calc(var(--target-right) - var(--tour-radius)) calc(var(--target-bottom) - var(--tour-radius));
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size:
    100% var(--target-top),
    var(--target-left) var(--target-height),
    calc(100% - var(--target-right)) var(--target-height),
    100% calc(100% - var(--target-bottom)),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius);
  mask-composite: add;
  mask-image:
    linear-gradient(black, black), linear-gradient(black, black), linear-gradient(black, black),
    linear-gradient(black, black),
    radial-gradient(circle at 100% 100%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 0% 100%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 100% 0%, transparent var(--tour-radius), black var(--tour-radius)),
    radial-gradient(circle at 0% 0%, transparent var(--tour-radius), black var(--tour-radius));
  mask-position:
    0 0,
    0 var(--target-top),
    var(--target-right) var(--target-top),
    0 var(--target-bottom),
    var(--target-left) var(--target-top),
    calc(var(--target-right) - var(--tour-radius)) var(--target-top),
    var(--target-left) calc(var(--target-bottom) - var(--tour-radius)),
    calc(var(--target-right) - var(--tour-radius)) calc(var(--target-bottom) - var(--tour-radius));
  mask-repeat: no-repeat;
  mask-size:
    100% var(--target-top),
    var(--target-left) var(--target-height),
    calc(100% - var(--target-right)) var(--target-height),
    100% calc(100% - var(--target-bottom)),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius),
    var(--tour-radius) var(--tour-radius);
}
`
