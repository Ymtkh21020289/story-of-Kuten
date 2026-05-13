const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('messageBox');

const TILE_SIZE = 32;
const COLS = 15;
const ROWS = 15;

const TILE_FLOOR = 0;
const TILE_WALL = 1;
const TILE_MONUMENT = 2; // 石碑
const TILE_NPC = 3;      // ★追加：NPC

// マップデータ (15x15) - [5][10]の位置にNPC(3)を追加しました
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,0,1],
    [1,0,1,2,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,1,1,1,1,1,1,1,1,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,1,3,1,0,0,1], // ←ここにNPC
    [1,1,1,1,1,0,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,2,0,1,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,0,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

let player = { x: 1, y: 1, dirX: 0, dirY: 1, color: '#e74c3c' };

// ★会話イベント用の一時変数
let isMessageOpen = false;
let currentMessageQueue = []; // 複数ページのメッセージを保存する配列
let messageIndex = 0;         // 現在何ページ目を読んでいるか

// ------------------------------------------------------------------
// 創作言語変換・辞書システム（前回から変更なし）
// ------------------------------------------------------------------
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
        if(isMessageOpen) showCurrentMessage(); // メッセージのルビを即座に更新
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
        const meaningDisplay = isForDict ? "" : meaning; // 辞書の時はルビ非表示

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

// ------------------------------------------------------------------
// イベント・描画処理
// ------------------------------------------------------------------

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let tile = map[y][x];
            if (tile === TILE_FLOOR) ctx.fillStyle = '#f8f9fa';
            else if (tile === TILE_WALL) ctx.fillStyle = '#bdc3c7';
            else if (tile === TILE_MONUMENT) ctx.fillStyle = '#8e44ad';
            else if (tile === TILE_NPC) ctx.fillStyle = '#27ae60'; // ★NPCは緑色
            
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            if (tile === TILE_MONUMENT) {
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(x * TILE_SIZE + 10, y * TILE_SIZE + 8, 12, 16);
            } else if (tile === TILE_NPC) {
                // NPCの見た目（丸みを持たせるなど）
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath();
                ctx.arc(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, 12, 0, Math.PI*2);
                ctx.fill();
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

// ★イベント・NPCのデータ
const eventData = {
    monuments: {
        "3,3": ["石碑だ。<br>「a i u e o」"],
        "7,7": ["古い記録だ。<br>「yotiyoti 」"],
        "7,13": ["「mimi lose」"]
    },
    npcs: {
        "10,5": {
            talkCount: 0, // 話しかけられた回数を記録
            dialogues: [
                // 初回 (talkCount: 0) の会話：3ページに分かれている
                [
                    "少女が心配そうにこちらを見ている。",
                    "「yoti kounn hu ?」",
                    "「yoti yo mi sitala nou ?」",
                    "「・・・」",
                    "「sitala ki ?」",
                    "「a nou」",
                    "「mi kute sike lo yoti」"
                ],
                // 2回目以降 (talkCount: 1以降) の会話：1ページのみ
                [
                    "「yoti kounn hu ?」",
                    "「yoti nou yo mi sitala ?」",
                    "「・・・」",
                    "「sitala ki ?」",
                    "「a nou」",
                    "「mi kute sike lo yoti」"
                ]
            ]
        }
    },
    autoEvents: {
        "3,1": { // 発生する座標
            isDone: false, // 実行済みかどうかのフラグ（1回だけ発生させるため）
            dialogues: [
                "……何かの気配を感じる。",
                "頭の中に直接声が響いてきた！<br>「wa wo n」",
                "気配は消え去った。"
            ]
        }
    }
};

window.addEventListener('keydown', (e) => {
    if (isDictOpen && e.key !== 'Escape') return; 
    if (e.key === 'Escape' && isDictOpen) { toggleDict(); return; }

    // ★会話中のページ送り処理
    if (isMessageOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
            messageIndex++; // 次のページへ
            if (messageIndex < currentMessageQueue.length) {
                showCurrentMessage(); // まだページがあれば表示
            } else {
                closeMessage(); // なければ閉じる
            }
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

    if (map[nextY] && map[nextY][nextX] === TILE_FLOOR) {
        player.x = nextX; player.y = nextY;
    }
    
    checkAutoEvent();
    draw();
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
});

function checkEvent() {
    let targetX = player.x + player.dirX;
    let targetY = player.y + player.dirY;
    let targetTile = map[targetY] ? map[targetY][targetX] : -1;
    let key = `${targetX},${targetY}`;

    if (targetTile === TILE_MONUMENT) {
        // 石碑のデータを取得（配列）
        currentMessageQueue = eventData.monuments[key] || ["何も書かれていない。"];
        messageIndex = 0;
        showCurrentMessage();

    } else if (targetTile === TILE_NPC) {
        // ★NPCのデータを取得
        let npc = eventData.npcs[key];
        if (npc) {
            // 会話回数に応じて配列を切り替える
            if (npc.talkCount === 0) {
                currentMessageQueue = npc.dialogues[0];
            } else {
                currentMessageQueue = npc.dialogues[1]; // 今回は2パターンのみ
            }
            npc.talkCount++; // 会話回数を増やす
        } else {
            currentMessageQueue = ["返事がない。"];
        }
        messageIndex = 0;
        showCurrentMessage();
    }
}

// ★現在のページのメッセージを描画する関数
function showCurrentMessage() {
    let rawText = currentMessageQueue[messageIndex];
    
    let finalHtml = rawText.replace(/「(.*?)」/g, (match, p1) => {
        return "「" + translateToConlangHtml(p1) + "」";
    });
    
    // もし続きのページがあれば、点滅する▼を表示
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

function checkAutoEvent() {
    let key = `${player.x},${player.y}`;
    let autoEvent = eventData.autoEvents[key];
    
    // その座標に自動イベントが存在し、かつ「未実行」なら開始する
    if (autoEvent && !autoEvent.isDone) {
        autoEvent.isDone = true; // 二度と発生しないようにフラグを立てる
        
        // 会話メッセージのキューにセットして表示
        currentMessageQueue = autoEvent.dialogues;
        messageIndex = 0;
        showCurrentMessage();
    }
}
draw();
