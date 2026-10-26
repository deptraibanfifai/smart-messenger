import test from 'node:test';
import assert from 'node:assert/strict';
import { createTypingNotifier } from '../src/utils/typingNotifier.js';
import { wsService } from '../src/services/websocket.js';

function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(fn, delay) { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { timers.delete(key); },
    tick(ms) { now += ms; for (const [key, item] of [...timers]) if (item.at <= now) { timers.delete(key); item.fn(); } },
  };
}

test('typing starts on first keystroke, refreshes while typing, then expires', () => {
  const clock = fakeClock(), events = [];
  const notifier = createTypingNotifier(value => { events.push(value); return true; }, clock);
  notifier.change('h'); assert.deepEqual(events, [true]);
  clock.tick(100); notifier.change('he'); assert.deepEqual(events, [true]);
  clock.tick(1200); notifier.change('hello'); assert.deepEqual(events, [true, true]);
  clock.tick(2200); assert.deepEqual(events, [true, true, false]);
});

test('clearing text or leaving a conversation stops typing immediately', () => {
  const clock = fakeClock(), events = [];
  const notifier = createTypingNotifier(value => { events.push(value); return true; }, clock);
  notifier.change('a'); notifier.change('');
  notifier.change('b'); notifier.stop(); clock.tick(5000);
  assert.deepEqual(events, [true, false, true, false]);
});

test('a disconnected keystroke does not delay the first event after reconnect', () => {
  const clock = fakeClock(), events = [];
  let connected = false;
  const notifier = createTypingNotifier(value => { if (!connected) return false; events.push(value); return true; }, clock);
  notifier.change('a'); connected = true; notifier.change('ab');
  assert.deepEqual(events, [true]);
});

test('a subscription registered before connect can be fully removed after connect', () => {
  const service = new wsService.constructor();
  const handler = () => {};
  const queued = service.subscribe('/topic/typing/1', handler);
  let removed = 0;
  service.connected = true;
  service.client = { subscribe: () => ({ unsubscribe() { removed++; } }) };
  service.attachSubscription('/topic/typing/1', handler);
  queued.unsubscribe();
  assert.equal(removed, 1);
  assert.equal(service.listeners.size, 0);
  assert.equal(service.subscriptions.size, 0);
});

test('cleanup from an older render preserves a replacement subscription', () => {
  const service = new wsService.constructor();
  service.connected = true;
  let removed = 0;
  service.client = { subscribe: () => ({ unsubscribe() { removed++; } }) };
  const old = service.subscribe('/topic/typing/1', () => {});
  const replacement = service.subscribe('/topic/typing/1', () => {});
  old.unsubscribe(); assert.equal(service.listeners.size, 1); assert.equal(removed, 1);
  replacement.unsubscribe(); assert.equal(service.listeners.size, 0); assert.equal(removed, 2);
});
