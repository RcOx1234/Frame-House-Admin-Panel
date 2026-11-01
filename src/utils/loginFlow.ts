// A login operation belongs to this tab's live JS runtime, never to persistent storage.
// An abandoned tab must not leave every future visit waiting for a stale "1" flag.
let pending: Promise<void> | undefined;
export function beginLoginFlow(): () => void {
  let finish!: () => void;
  const current = new Promise<void>(resolve => { finish = resolve; });
  pending = current;
  return () => { finish(); if (pending === current) pending = undefined; };
}
export async function waitForLoginFlow(): Promise<void> {
  await pending;
}
