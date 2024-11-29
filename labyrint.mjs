import ANSI from "./utils/ANSI.mjs";
import KeyBoardManager from "./utils/KeyBoardManager.mjs";
import { readMapFile, readRecordFile } from "./utils/fileHelpers.mjs";
import * as CONST from "./constants.mjs";


const startingLevel = CONST.START_LEVEL_ID;
const levels = loadLevelListings();

function loadLevelListings(source = CONST.LEVEL_LISTING_FILE) {
    let data = readRecordFile(source);
    let levels = {};
    for (const item of data) {
        let keyValue = item.split(":");
        if (keyValue.length >= 2) {
            let key = keyValue[0];
            let value = keyValue[1];
            levels[key] = value;
        }
    }
    return levels;
}

let currentLevel = startingLevel;
let levelData = readMapFile(levels[startingLevel]);
let level = levelData;

let pallet = {
    "█": ANSI.COLOR.LIGHT_GRAY,
    "H": ANSI.COLOR.RED,
    "$": ANSI.COLOR.YELLOW,
    "B": ANSI.COLOR.GREEN,
    "O": ANSI.COLOR.BLUE,
    "Ø": ANSI.COLOR.BLUE,
    "X": ANSI.COLOR.RED,
    "\u2668": ANSI.COLOR.YELLOW,
}

let isDirty = true;
let playerPos = {
    row: null,
    col: null,
}

let npcPositions = [];

const EMPTY = " ";
const HERO = "H";
const LOOT = "$";
const WALL = "█";
const DOOR = "O";
const BACKDOOR = "Ø";
const NPC = "X";
const TELEPORT = "\u2668";
const LEVEL_CONNECTIONS = {
    "start": { 
        next: "aSharpPlace", 
        prev: null 
    },
    "aSharpPlace": { 
        next: "treasureMap", 
        prev: "start" 
    },
    "treasureMap": { 
        next: null, 
        prev: "aSharpPlace" 
    }
};

let direction = -1;

let items = [];

const THINGS = [LOOT, EMPTY, NPC, TELEPORT];

let eventText = "";

const HP_MAX = 10;

const playerStats = {
    hp: 8,
    chash: 0
}

class Labyrinth {

    loadLevel(levelNumber) {
        currentLevel = levelNumber
        levelData = readMapFile(levels[levelNumber]);
        level = levelData;
        playerPos = {row: null, col: null};
        isDirty = true;
        eventText = `Entered ${levelNumber}`;
        this.findNPCs();
    }

    findNPCs() {
        npcPositions = [];
        for (let row = 0; row < level.length; row++) {
            for (let col = 0; col < level[row].length; col++) {
                if (level[row][col] === NPC) {
                    npcPositions.push({
                        row: row,
                        col: col,
                        startRow: row,
                        direction: 1,
                        steps: 0
                    });
                }
            }
        }
    }

    LocateOtherTeleport(currentRow, currentCol) {
        for (let row = 0; row < level.length; row++) {
            for (let col = 0; col < level[row].length; col++) {
                if (level[row][col] === TELEPORT && (row !== currentRow || col !== currentCol)) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    updateNPCs() {
        for (let npc of npcPositions) {
            let oldRow = npc.row;
            let oldCol = npc.col;
            let newRow = npc.row + npc.direction;
            if (Math.abs(newRow - npc.startRow) >= 2 || level[newRow][npc.col] === WALL) {
                npc.direction *= -1;
                newRow = npc.row + npc.direction;
            }
            if (level[newRow][npc.col] === EMPTY) {
                level[oldRow][oldCol] = EMPTY;
                level[newRow][npc.col] = NPC;
                npc.row = newRow;
            }
        }
    }

    update() {

        if (playerPos.row == null) {
            for (let row = 0; row < level.length; row++) {
                for (let col = 0; col < level[row].length; col++) {
                    if (level[row][col] == "H") {
                        playerPos.row = row;
                        playerPos.col = col;
                        break;
                    }
                }
                if (playerPos.row != undefined) {
                    break;
                }
            }
        }

        let drow = 0;
        let dcol = 0;

        if (KeyBoardManager.isUpPressed()) {
            drow = -1;
        } else if (KeyBoardManager.isDownPressed()) {
            drow = 1;
        }

        if (KeyBoardManager.isLeftPressed()) {
            dcol = -1;
        } else if (KeyBoardManager.isRightPressed()) {
            dcol = 1;
        }

        let tRow = playerPos.row + (1 * drow);
        let tcol = playerPos.col + (1 * dcol);

        if (level[tRow][tcol] === DOOR) {
            if (currentLevel === "start") {
                this.loadLevel("aSharpPlace");
                return;
            }
            else if (currentLevel === "aSharpPlace") {
                this.loadLevel('treasureMap');
                return;
            }
        }

        if (level[tRow][tcol] === BACKDOOR) {
            if (currentLevel === "aSharpPlace") {
                this.loadLevel('start');
                return;
            }
            else if (currentLevel === "treasureMap") {
                this.loadLevel("aSharpPlace");
                return;
            }
        }

        if (THINGS.includes(level[tRow][tcol])) { // Is there anything where Hero is moving to

            if (drow !== 0 || dcol !== 0) {
                eventText = "";
            }

            let currentItem = level[tRow][tcol];

            if (currentItem == NPC) {
                eventText = "The Hero swiftly sneaked past the guards!";
            }

            if (currentItem == LOOT) {
                let loot = Math.round(Math.random() * 7) + 3;
                playerStats.chash += loot;
                eventText = `Player gained ${loot}$`;
            }

            // Can't walk into the teleport from the right side.
            if (currentItem == TELEPORT) {
                let otherTeleport = this.LocateOtherTeleport(tRow, tcol);
                if (otherTeleport) {
                    level[playerPos.row][playerPos.col] = EMPTY;
                    let destinationCol = otherTeleport.col + 1;
                    if (level[otherTeleport.row][destinationCol] !== EMPTY) {
                        destinationCol = otherTeleport.col - 1;
                    }
                    if (level[otherTeleport.row][destinationCol] === EMPTY) {
                        level[otherTeleport.row][destinationCol] = HERO;
                        playerPos.row = otherTeleport.row;
                        playerPos.col = destinationCol;
                        eventText = "The Hero went through a spirit gate!";
                        isDirty = true;
                        return;
                    }
                }
            }

            // Move the HERO
            level[playerPos.row][playerPos.col] = EMPTY;
            level[tRow][tcol] = HERO;

            // Update the HERO
            playerPos.row = tRow;
            playerPos.col = tcol;

            // Make the draw function draw.
            isDirty = true;
        } else {
            direction *= -1;
        }
        this.updateNPCs();
    }

    draw() {

        if (isDirty == false) {
            return;
        }
        isDirty = false;

        console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME);

        let rendring = "";

        rendring += renderHud();

        for (let row = 0; row < level.length; row++) {
            let rowRendering = "";
            for (let col = 0; col < level[row].length; col++) {
                let symbol = level[row][col];
                if (pallet[symbol] != undefined) {
                    rowRendering += pallet[symbol] + symbol + ANSI.COLOR_RESET;
                } else {
                    rowRendering += symbol;
                }
            }
            rowRendering += "\n";
            rendring += rowRendering;
        }

        console.log(rendring);
        if (eventText != "") {
            console.log(eventText);
        }
    }
}

function renderHud() {
    let hpBar = `Life:[${ANSI.COLOR.RED + pad(playerStats.hp, "♥︎") + ANSI.COLOR_RESET}${ANSI.COLOR.LIGHT_GRAY + pad(HP_MAX - playerStats.hp, "♥︎") + ANSI.COLOR_RESET}]`
    let cash = `$:${playerStats.chash}`;
    return `${hpBar} ${cash}\n`;
}

function pad(len, text) {
    let output = "";
    for (let i = 0; i < len; i++) {
        output += text;
    }
    return output;
}


export default Labyrinth;