// Deliberately loose (`any`) on interaction params — discord.js's per-interaction-type
// builder/union types get unwieldy across a router that dispatches by JSON-encoded
// customId rather than discord.js's own component-id patterns. Each command narrows
// what it needs internally.
export interface BotCommand {
  data: { name: string; toJSON: () => unknown } | { name: string };
  execute?(interaction: any): Promise<unknown>;
  autocomplete?(interaction: any): Promise<unknown>;
  button?(interaction: any): Promise<unknown>;
  select?(interaction: any): Promise<unknown>;
  modal?(interaction: any): Promise<unknown>;
}
