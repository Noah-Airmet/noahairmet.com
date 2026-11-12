// The share card's stage (/card/): the agents and the name, nothing else.
// scripts/card.mjs scatters the letters here and records the agents setting
// them again.
import { agents, hire } from "./agents";
import { calm, pageRect } from "./kit";
import { startName } from "./name";

const name = document.getElementById("name") as HTMLElement;

async function start() {
  if (calm) return;
  await Promise.all([document.fonts.load('1000 100px "Flex"', "Noah Airmet"), document.fonts.ready]);

  const fable = hire("fable", "fable");
  const opus = hire("opus", "opus");
  const opus2 = hire("opus", "opus");
  const W = () => document.documentElement.clientWidth;
  // Where each waits between jobs: in a row under the name.
  const under = () => {
    const n = pageRect(name);
    return n.y + n.h;
  };
  fable.post = () => ({ x: W() * 0.34, y: under() + 12 });
  opus.post = () => ({ x: W() * 0.55, y: under() + 19 });
  opus2.post = () => ({ x: W() * 0.76, y: under() + 10 });

  document.documentElement.classList.add("live");
  await startName({ intro: false, slips: false }).ready;
  // after the name is sized: the posts hang off where it ends
  for (const a of agents) {
    const p = a.post();
    a.set(p.x, p.y);
    a.show();
  }
  document.documentElement.dataset.card = "ready";
}

void start();
