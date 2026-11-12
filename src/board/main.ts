// The home page's board: hire the agents, set the name, then start the exhibits.
import { agents, hire, watchPointer } from "./agents";
import { startBench } from "./bench";
import { startGuard } from "./guard";
import { calm, pageRect } from "./kit";
import { startName } from "./name";
import { startOutside } from "./outside";
import { startQuote } from "./quote";

const hero = document.getElementById("top") as HTMLElement;

startBench();
startQuote();
void startOutside();

async function start() {
  if (calm) return;
  await Promise.all([document.fonts.load('1000 100px "Flex"', "Noah Airmet"), document.fonts.ready]);

  const fable = hire("fable", "fable");
  const opus = hire("opus", "opus");
  const opus2 = hire("opus", "opus");
  const W = () => document.documentElement.clientWidth;
  const foot = () => {
    const r = pageRect(hero);
    return r.y + r.h;
  };
  // Where each waits between jobs: the open band between the name and the lede.
  const band = () => {
    const y = (sel: string, edge: "y" | "end") => {
      const node = hero.querySelector(sel);
      if (!node) return 0;
      const r = pageRect(node);
      return edge === "y" ? r.y : r.y + r.h;
    };
    const top = Math.max(y(".name", "end"), y(".roles", "end"));
    return (top + y(".foot", "y")) / 2;
  };
  fable.post = () => ({ x: W() * 0.6, y: band() + 8 });
  opus.post = () => ({ x: W() * 0.73, y: band() - 16 });
  opus2.post = () => ({ x: W() * 0.86, y: band() + 22 });

  // If the plain name already came back (a slow load), set the pieces quietly
  // instead of spilling them over text the visitor has been reading.
  const root = document.documentElement;
  const late = !root.classList.contains("live");
  root.classList.add("live");
  const seen = late || sessionStorage.getItem("set") === "1";
  if (seen) {
    for (const a of agents) {
      const p = a.post();
      a.set(p.x, p.y);
      a.show();
    }
  } else {
    fable.set(W() + 40, foot() - 300);
    opus.set(-40, foot() - 200);
    opus2.set(W() * 0.5, foot() + 60);
  }
  const { ready } = startName({ intro: !seen });
  watchPointer();
  startGuard();
  await ready;
  sessionStorage.setItem("set", "1");
}

void start();
