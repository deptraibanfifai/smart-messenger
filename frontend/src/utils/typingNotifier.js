// One notifier per conversation. Only mark a typing event as sent if connected.
export function createTypingNotifier(publish, clock = {
  now: () => Date.now(), setTimeout: (...args) => window.setTimeout(...args), clearTimeout: id => window.clearTimeout(id),
}) {
  let lastSent = -Infinity;
  let active = false;
  let timeout;
  const stop = () => {
    clock.clearTimeout(timeout);
    if (active) publish(false);
    active = false;
    lastSent = -Infinity;
  };
  return {
    change(text) {
      if (!text.trim()) { stop(); return; }
      if (clock.now() - lastSent >= 1200 && publish(true)) {
        lastSent = clock.now(); active = true;
      }
      clock.clearTimeout(timeout);
      timeout = clock.setTimeout(stop, 2200);
    },
    stop,
  };
}
