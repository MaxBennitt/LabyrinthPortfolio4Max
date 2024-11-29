import Labyrinth from "./labyrint.mjs"
import SplashScreen from "./splashScreen.mjs";
import ANSI from "./utils/ANSI.mjs";

const REFRESH_RATE = 250;

console.log(ANSI.RESET, ANSI.CLEAR_SCREEN, ANSI.HIDE_CURSOR);

let intervalID = null;
let isBlocked = false;
let state = null;
let splashScreen = null;

function init() {
    splashScreen = new SplashScreen();
    state = splashScreen;
    intervalID = setInterval(update, REFRESH_RATE);
}

function update() {

    if (isBlocked) { return; }
    isBlocked = true;
    state.update();
    state.draw();
    if (splashScreen && state === splashScreen && splashScreen.isFinished()) {
        state = new Labyrinth();
        splashScreen = null;
    }
    isBlocked = false;
}

init();