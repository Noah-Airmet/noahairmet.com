// The home page's figures: the leaderboard, the quote check, the Catchword
// card, the mountain and the day bar. Each starts itself when it is seen.
import { startAsk } from "./ask";
import { startBench } from "./bench";
import { startDaybar } from "./daybar";
import { startOutside } from "./outside";
import { startQuote } from "./quote";
import { startTilt } from "./tilt";

startTilt();
startBench();
startQuote();
startAsk();
void startOutside();
startDaybar();
