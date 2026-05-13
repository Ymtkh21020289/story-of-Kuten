const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');

const TILE_SIZE = 32;
const COLS = 15;
const ROWS = 15;

const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_MONUMENT = 2;
const TILE_NPC = 3;
const TILE_WARP = 4; // ★新規追加：ワープポイント（階段や扉など）

// ★複数マップのデータ
const mapData = {
    "map_start": [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,0,1],
        [1,0,1,2,0,0,0,0,0,0,0,1,0,0,1],
        [1,0,1,1,1,1,1,1,1,1,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,3,1,0,0,1],
        [1,1,1,1,1,0,1,1,0,1,0,1,1,0,1],
        [1,0,0,0,0,0,1,2,0,1,0,0,0,0,4], // ★右端(14,7)にワープを配置
        [1,1,1,1,1,0,1,1,1,1,0,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    "map_corridor": [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,0,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,2,0,1,1,1,1,1,1],
        [4,0,0,0,0,0,0,0,0,0,0,0,0,0,4], // ★左端(0,7)と右端(14,7)にワープ
        [1,1,1,1,1,1,0,1,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,0,0,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ]
};

let currentMapId = "map_start"; // 現在のマップID
let map = mapData[currentMapId]; // 描画・判定に使う現在のマップ配列

let player = { x: 1, y: 1, dirX: 0, dirY: 1, color: '#e74c3c' };

let isMessageOpen = false;
let currentMessageQueue = [];
let messageIndex = 0;

// --- 創作言語・辞書システム ---
const FONT_CONF = { charWidth: 32, charHeight: 32, cols: 18 };
const conlangOrder = [
    'a','ya','ta','la','ka','pa','ha','sa','na','ma','tya','lya','kya','pya','hya','sya','mya','pha', // 1行目
    'i','yi','ti','li','ki','pi','hi','si','ni','mi','tyi','lyi','kyi','pyi','hyi','syi','myi','phi', // 2行目
    'u','yu','tu','lu','ku','pu','hu','su','nu','mu','tyu','lyu','kyu','pyu','hyu','syu','myu','phu', // 3行目
    'e','ye','te','le','ke','pe','he','se','ne','me','tye','lye','kye','pye','hye','sye','mye','phe', // 4行目
    'o','yo','to','lo','ko','po','ho','so','no','mo','tyo','lyo','kyo','pyo','hyo','syo','myo','pho', // 5行目
    'ltu','y','t','l','k','p','h','s','n','m','nn' // 6行目
];
const charToIndexMap = {};
conlangOrder.forEach((str, index) => { charToIndexMap[str] = index; });
const sortedKeys = Object.keys(charToIndexMap).sort((a, b) => b.length - a.length);
const matchRegex = new RegExp(sortedKeys.join('|') + '|[\\s\\S]', 'g');

let playerDictionary = {};
let isDictOpen = false;

function toggleDict() {
    const panel = document.getElementById('dictionary-panel');
    const btn = document.getElementById('dict-toggle');
    isDictOpen = !isDictOpen;
    if (isDictOpen) {
        panel.classList.add('open');
        btn.innerText = "✕ 閉じる";
    } else {
        panel.classList.remove('open');
        btn.innerText = "📖 辞書を開く";
    }
    btn.blur();
}

function openDictionaryInput(conlangWord) {
    const currentMeaning = playerDictionary[conlangWord] || "";
    const input = prompt(`単語「${conlangWord}」の意味を推測してください:`, currentMeaning);
    if (input !== null) {
        playerDictionary[conlangWord] = input;
        updateDictionaryUI();
        if(isMessageOpen) showCurrentMessage();
    }
}

function updateDictionaryUI() {
    const list = document.getElementById('dictList');
    if (Object.keys(playerDictionary).length === 0) {
        list.innerHTML = "<div style='color:#95a5a6; padding:10px;'>記録なし</div>";
        return;
    }
    list.innerHTML = "";
    for (const [word, meaning] of Object.entries(playerDictionary)) {
        const div = document.createElement('div');
        div.className = 'dict-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        const conlangVisual = translateToConlangHtml(word, true);
        div.innerHTML = `
            <div style="cursor:pointer;" onclick="openDictionaryInput('${word}')">${conlangVisual}</div>
            <div style="font-size: 16px; color: #2c3e50; border-left: 1px solid #ccc; padding-left: 10px; margin-left: 10px; flex-grow: 1; text-align: right;">
                ${meaning || "???"}
            </div>
        `;
        list.appendChild(div);
    }
}

function translateToConlangHtml(fullText, isForDict = false) {
    const words = fullText.split(/[\s　]+/);
    let htmlResult = "";
    words.forEach((word, index) => {
        if (word === "") return;
        let charsHtml = "";
        let remaining = word;
        while (remaining.length > 0) {
            let match = remaining.match(matchRegex)[0];
            if (charToIndexMap[match] !== undefined) {
                let idx = charToIndexMap[match];
                let posX = -( (idx % FONT_CONF.cols) * FONT_CONF.charWidth );
                let posY = -( Math.floor(idx / FONT_CONF.cols) * FONT_CONF.charHeight );
                charsHtml += `<span class="conlang-char" style="background-position: ${posX}px ${posY}px;"></span>`;
            } else {
                charsHtml += match;
            }
            remaining = remaining.substring(match.length);
        }
        const meaning = playerDictionary[word] || "";
        const meaningDisplay = isForDict ? "" : meaning;
        htmlResult += `
            <div class="word-container" onclick="openDictionaryInput('${word}')">
                <span class="word-ruby">${meaningDisplay}</span>
                <span class="word-body">${charsHtml}</span>
            </div>
        `;
        if (index < words.length - 1) {
            htmlResult += "<span style='display:inline-block; width: 12px;'></span>";
        }
    });
    return htmlResult;
}

// --- 描画処理 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let tile = map[y][x];
            if (tile === TILE_FLOOR) ctx.fillStyle = '#f8f9fa';
            else if (tile === TILE_WALL) ctx.fillStyle = '#bdc3c7';
            else if (tile === TILE_MONUMENT) ctx.fillStyle = '#8e44ad';
            else if (tile === TILE_NPC) ctx.fillStyle = '#27ae60';
            else if (tile === TILE_WARP) ctx.fillStyle = '#3498db'; // ★ワープは青色
            
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            if (tile === TILE_MONUMENT) {
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 8, 12, 16);
            } else if (tile === TILE_NPC) {
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, 12, 0, Math.PI*2);
                ctx.fill();
            } else if (tile === TILE_WARP) {
                // ワープタイルの装飾
                ctx.strokeStyle = '#2980b9';
                ctx.lineWidth = 2;
                ctx.strokeRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            }
        }
    }
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x * TILE_SIZE + TILE_SIZE/2, player.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2.5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(player.x * TILE_SIZE + TILE_SIZE/2 + (player.dirX * 8), player.y * TILE_SIZE + TILE_SIZE/2 + (player.dirY * 8), 3, 0, Math.PI*2);
    ctx.fill();
}

// --- 各種データ（マップごとに階層化） ---
const eventData = {
    "map_start": {
        monuments: {
            "3,3": ["石碑だ。<br>「a i u e o」"],
            "7,7": ["古い記録だ。<br>「nya na n」"],
            "7,13": ["「shi tsu」"]
        },
        npcs: {
            "10,5": {
                talkCount: 0,
                dialogues: [
                    ["フードの人物がいる。", "「nya a i u」"],
                    ["「nya a i u」"]
                ]
            }
        },
        autoEvents: {
            "3,1": {
                isDone: false,
                dialogues: ["……何かの気配を感じる。", "頭の中に声が響く。<br>「wa wo n」"]
            }
        }
    },
    "map_corridor": {
        monuments: {
            "7,6": ["新しい部屋の石碑だ。<br>「ko ko wa do ko da」"]
        },
        npcs: {},
        autoEvents: {}
    }
};

// ★ワープポイントの設定データ
const warpData = {
    "map_start": {
        "14,7": { targetMap: "map_corridor", targetX: 1, targetY: 7 } // 右端へ行くと通路へ
    },
    "map_corridor": {
        "0,7": { targetMap: "map_start", targetX: 13, targetY: 7 },  // 左端へ行くとスタートに戻る
        "14,7": { targetMap: "map_corridor", targetX: 14, targetY: 7 } // (未作成)次へ進む用のダミー
    }
};

// --- キー入力と移動 ---
window.addEventListener('keydown', (e) => {
    if (isDictOpen && e.key !== 'Escape') return; 
    if (e.key === 'Escape' && isDictOpen) { toggleDict(); return; }

    if (isMessageOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
            messageIndex++;
            if (messageIndex < currentMessageQueue.length) showCurrentMessage();
            else closeMessage();
        }
        return;
    }

    let nextX = player.x + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
    let nextY = player.y + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);

    if (e.key === 'ArrowUp') { player.dirX = 0; player.dirY = -1; }
    else if (e.key === 'ArrowDown') { player.dirX = 0; player.dirY = 1; }
    else if (e.key === 'ArrowLeft') { player.dirX = -1; player.dirY = 0; }
    else if (e.key === 'ArrowRight') { player.dirX = 1; player.dirY = 0; }
    else if (e.key === 'Enter' || e.key === ' ') { checkEvent(); return; }

    // 移動先のタイルが床(0)またはワープ(4)なら移動を許可
    if (map[nextY] && (map[nextY][nextX] === TILE_FLOOR || map[nextY][nextX] === TILE_WARP)) {
        player.x = nextX; player.y = nextY;
        
        checkWarp(); // ★ワープに乗ったか判定
        draw();
        checkAutoEvent();
    } else {
        draw();
    }

    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
});

// ★ワープ判定
function checkWarp() {
    let key = `${player.x},${player.y}`;
    let currentWarps = warpData[currentMapId];
    
    if (currentWarps && currentWarps[key]) {
        let warpInfo = currentWarps[key];
        
        // マップと座標の切り替え
        currentMapId = warpInfo.targetMap;
        map = mapData[currentMapId];
        player.x = warpInfo.targetX;
        player.y = warpInfo.targetY;
    }
}

// イベント判定
function checkEvent() {
    let targetX = player.x + player.dirX;
    let targetY = player.y + player.dirY;
    let targetTile = map[targetY] ? map[targetY][targetX] : -1;
    let key = `${targetX},${targetY}`;
    
    // 現在のマップのイベントデータを取得
    let currentMapEvents = eventData[currentMapId];

    if (targetTile === TILE_MONUMENT) {
        currentMessageQueue = currentMapEvents.monuments[key] || ["何も書かれていない。"];
        messageIndex = 0;
        showCurrentMessage();
    } else if (targetTile === TILE_NPC) {
        let npc = currentMapEvents.npcs[key];
        if (npc) {
            if (npc.talkCount === 0) currentMessageQueue = npc.dialogues[0];
            else currentMessageQueue = npc.dialogues[npc.dialogues.length - 1];
            npc.talkCount++;
        } else {
            currentMessageQueue = ["返事がない。"];
        }
        messageIndex = 0;
        showCurrentMessage();
    }
}

function checkAutoEvent() {
    let key = `${player.x},${player.y}`;
    let currentMapEvents = eventData[currentMapId];
    
    if (currentMapEvents && currentMapEvents.autoEvents) {
        let autoEvent = currentMapEvents.autoEvents[key];
        if (autoEvent && !autoEvent.isDone) {
            autoEvent.isDone = true;
            currentMessageQueue = autoEvent.dialogues;
            messageIndex = 0;
            showCurrentMessage();
        }
    }
}

function showCurrentMessage() {
    let rawText = currentMessageQueue[messageIndex];
    let finalHtml = rawText.replace(/「(.*?)」/g, (match, p1) => {
        return "「" + translateToConlangHtml(p1) + "」";
    });
    if (messageIndex < currentMessageQueue.length - 1) {
        finalHtml += "<div class='next-triangle'>▼</div>";
    }
    messageBox.innerHTML = finalHtml;
    messageBox.style.display = 'block';
    isMessageOpen = true;
}

function closeMessage() {
    messageBox.style.display = 'none';
    isMessageOpen = false;
    currentMessageQueue = [];
}

draw();
