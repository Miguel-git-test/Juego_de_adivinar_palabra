import { WORDS } from './words.js';

let currentWord = null;
let guesses = [];
let currentGuess = "";
let isGameOver = false;
const MAX_ATTEMPTS = 6;

// Normalization function to ignore accents
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

// DOM Elements
const menu = document.getElementById('selection-menu');
const gameContainer = document.getElementById('game-container');
const categoryGrid = document.getElementById('category-grid');
const grid = document.getElementById('grid');
const modal = document.getElementById('result-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const wordBadge = document.getElementById('word-badge');
const playAgainBtn = document.getElementById('play-again');
const backBtn = document.getElementById('back-btn');

// Initialize Menu
function initMenu() {
    categoryGrid.innerHTML = '';
    WORDS.forEach(wordObj => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.innerHTML = `
            <span class="len">${wordObj.word.length} LETRAS</span>
            <span class="cat">${wordObj.category}</span>
        `;
        chip.onclick = () => startGame(wordObj);
        categoryGrid.appendChild(chip);
    });
}

function startGame(wordObj) {
    currentWord = wordObj.word.toUpperCase();
    guesses = [];
    currentGuess = "";
    isGameOver = false;
    
    // UI state
    menu.style.display = 'none';
    gameContainer.style.display = 'flex';
    
    setupGrid(currentWord.length);
    resetKeyboard();
}

function setupGrid(length) {
    grid.innerHTML = '';
    // Let's adjust grid size based on length
    grid.style.gridTemplateColumns = `repeat(${length}, 1fr)`;
    
    for (let i = 0; i < MAX_ATTEMPTS * length; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        grid.appendChild(tile);
    }
}

function resetKeyboard() {
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });
}

// Input Handling
function handleInput(key) {
    if (isGameOver) return;

    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'BACKSPACE' || key === 'BACK') {
        if (currentGuess.length > 0) {
            currentGuess = currentGuess.slice(0, -1);
            updateGrid();
        }
    } else if (/^[A-ZÑ]$/.test(key)) {
        if (currentGuess.length < currentWord.length) {
            currentGuess += key;
            updateGrid();
        }
    }
}

function updateGrid() {
    const rowIdx = guesses.length;
    const tiles = grid.children;
    const offset = rowIdx * currentWord.length;

    // Clear the current row first
    for (let i = 0; i < currentWord.length; i++) {
        const tile = tiles[offset + i];
        tile.textContent = currentGuess[i] || "";
        tile.classList.toggle('filled', !!currentGuess[i]);
    }
}

async function submitGuess() {
    if (currentGuess.length !== currentWord.length) {
        shakeRow();
        return;
    }

    const rowIdx = guesses.length;
    const guess = currentGuess;
    guesses.push(guess);
    currentGuess = "";

    const results = evaluateGuess(guess, currentWord);
    await animateRow(rowIdx, results);
    updateKeyboard(guess, results);

    if (norm(guess) === norm(currentWord)) {
        showResult(true);
    } else if (guesses.length >= MAX_ATTEMPTS) {
        showResult(false);
    }
}

function evaluateGuess(guess, target) {
    const results = new Array(target.length).fill('absent');
    const targetArr = target.split('');
    const guessArr = guess.split('');
    
    // Normalize comparison values
    const normTarget = targetArr.map(c => c ? norm(c) : null);
    const normGuess = guessArr.map(c => c ? norm(c) : null);

    // First pass: Correct
    for (let i = 0; i < target.length; i++) {
        if (normGuess[i] === normTarget[i]) {
            results[i] = 'correct';
            normTarget[i] = null;
            normGuess[i] = null;
        }
    }

    // Second pass: Present
    for (let i = 0; i < target.length; i++) {
        if (normGuess[i] !== null) {
            const partialIdx = normTarget.indexOf(normGuess[i]);
            if (partialIdx !== -1) {
                results[i] = 'present';
                normTarget[partialIdx] = null;
            }
        }
    }

    return results;
}

async function animateRow(rowIdx, results) {
    const tiles = Array.from(grid.children).slice(rowIdx * currentWord.length, (rowIdx + 1) * currentWord.length);
    
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        tile.classList.add('flip');
        
        // Wait for half the flip to change color
        await new Promise(r => setTimeout(r, 250));
        tile.classList.add(results[i]);
        
        // Wait for the other half
        await new Promise(r => setTimeout(r, 250));
    }
}

function updateKeyboard(guess, results) {
    for (let i = 0; i < guess.length; i++) {
        const key = document.querySelector(`.key[data-key="${guess[i]}"]`);
        if (!key) continue;
        
        if (results[i] === 'correct') {
            key.classList.add('correct');
        } else if (results[i] === 'present' && !key.classList.contains('correct')) {
            key.classList.add('present');
        } else if (results[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
            key.classList.add('absent');
        }
    }
}

function shakeRow() {
    const rowIdx = guesses.length;
    const tiles = Array.from(grid.children).slice(rowIdx * currentWord.length, (rowIdx + 1) * currentWord.length);
    tiles.forEach(t => t.classList.add('shake'));
    setTimeout(() => {
        tiles.forEach(t => t.classList.remove('shake'));
    }, 400);
}

function showResult(win) {
    isGameOver = true;
    const wordObj = WORDS.find(w => w.word.toUpperCase() === currentWord);
    
    modalTitle.textContent = win ? "¡Excelente!" : "Casi lo logras...";
    modalDesc.textContent = wordObj ? wordObj.description : "";
    wordBadge.textContent = currentWord;
    
    setTimeout(() => {
        modal.style.display = 'flex';
    }, 1500);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    let key = e.key.toUpperCase();
    if (key === 'ESCAPE') {
        modal.style.display = 'none';
        return;
    }
    if (key === 'BACKSPACE' || key === 'ENTER' || /^[A-ZÑ]$/.test(key)) {
        handleInput(key);
    }
});

document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        handleInput(key.dataset.key);
    });
});

playAgainBtn.onclick = () => {
    modal.style.display = 'none';
    menu.style.display = 'block';
    gameContainer.style.display = 'none';
};

backBtn.onclick = () => {
    menu.style.display = 'block';
    gameContainer.style.display = 'none';
};

initMenu();
