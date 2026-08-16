// Discord embeds have no concept of hidden metadata — every visible part of
// a message (footer included) renders to users. State a button/select needs
// to recover later ("which sound/creature is this message showing") either
// has to fit in the 100-char customId, or live here instead, keyed by the
// message it's attached to. In-memory only: state for a message is lost if
// the bot restarts, which just means old buttons stop working — same
// blast radius as the old bot losing its in-memory sound index on restart.
const MAX_ENTRIES = 2000;
const TTL_MS = 24 * 60 * 60 * 1000;

interface Entry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export function setMessageState<T>(messageId: string, value: T): void {
  if (store.size >= MAX_ENTRIES && !store.has(messageId)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(messageId, { value, expiresAt: Date.now() + TTL_MS });
}

export function getMessageState<T>(messageId: string): T | undefined {
  const entry = store.get(messageId);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(messageId);
    return undefined;
  }
  return entry.value as T;
}
