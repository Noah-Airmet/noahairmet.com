// Text on the page is watched. If something rewrites it (a visitor in the
// console, an extension), an agent types the original back and the change goes
// in the log. Anything marked data-keep is covered.
import { post, type Agent } from "./agents";
import { calm, pageRect, wait } from "./kit";
import { flag, record } from "./ledger";

export function startGuard() {
  if (calm) return;
  const kept = new Map<HTMLElement, string>();
  const mending = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-keep]").forEach((node) => kept.set(node, node.textContent ?? ""));
  if (!kept.size) return;

  const name = (node: HTMLElement) => node.dataset.keep || node.tagName.toLowerCase();

  const check = (node: HTMLElement) => {
    const want = kept.get(node)!;
    if (mending.has(node) || node.textContent === want) return;
    const key = `text:${name(node)}`;
    mending.add(node);
    flag(key, true);
    record("you", "rewrote", name(node));
    const since = performance.now();
    post({
      key,
      at: () => {
        const r = pageRect(node);
        return { x: r.x, y: r.y };
      },
      async run(a: Agent, signal: AbortSignal) {
        try {
          const r = pageRect(node);
          await a.moveTo({ x: r.x + 8, y: r.y + Math.min(r.h, 28) / 2 }, { signal });
          await a.click(signal);
          // take the wrong words out, then type the right ones in
          let now = node.textContent ?? "";
          const stepOut = Math.max(1, Math.ceil(now.length / 14));
          while (now.length) {
            now = now.slice(0, -stepOut);
            node.textContent = now;
            await wait(16, signal);
          }
          const stepIn = Math.max(1, Math.ceil(want.length / 30));
          for (let i = stepIn; i < want.length + stepIn; i += stepIn) {
            node.textContent = want.slice(0, i);
            await wait(18, signal);
          }
        } finally {
          node.textContent = want;
          flag(key, false);
          record(a.name, "restored", name(node), (performance.now() - since) / 1000);
          // let the observer see our own last write before it listens again
          setTimeout(() => mending.delete(node), 0);
        }
      },
    });
  };

  const seen = new MutationObserver((list) => {
    for (const m of list) {
      const el = m.target instanceof HTMLElement ? m.target : m.target.parentElement;
      const node = el?.closest<HTMLElement>("[data-keep]");
      if (node && kept.has(node)) check(node);
    }
  });
  for (const node of kept.keys()) seen.observe(node, { characterData: true, childList: true, subtree: true });

  // The one line of documentation, where the people who would try it look.
  console.log("document.querySelector('#lede').textContent = 'anything you like'");
}
