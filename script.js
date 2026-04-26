const sectorColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

const translations = {
    en: {
        pageTitle: 'Fortune Wheel',
        panelTitle: 'Fortune Wheel',
        itemsLabel: 'Wheel items (one per line)',
        itemsPlaceholder: 'Enter items...\\nPrize 1\\nPrize 2\\nPrize 3',
        itemCount: {
            one: '1 item',
            few: (n) => `${n} items`,
            other: (n) => `${n} items`
        },
        fairChoice: 'Fair choice',
        modeLabel: 'Mode',
        modeNormal: 'Normal',
        modeElimination: 'Elimination',
        durationLabel: 'Rotation duration',
        spinButton: 'Spin wheel',
        minItemsError: 'Add at least 2 items',
        defaultItems: 'Prize 1\nPrize 2\nPrize 3\nPrize 4\nPrize 5'
    },
    ru: {
        pageTitle: 'Колесо Фортуны',
        panelTitle: 'Колесо Фортуны',
        itemsLabel: 'Пункты колеса (каждый с новой строки)',
        itemsPlaceholder: 'Введите пункты...\\nПриз 1\\nПриз 2\\nПриз 3',
        itemCount: {
            one: '1 пункт',
            few: (n) => `${n} пункта`,
            other: (n) => `${n} пунктов`
        },
        fairChoice: 'Честный выбор',
        modeLabel: 'Режим',
        modeNormal: 'Обычный',
        modeElimination: 'На выбывание',
        durationLabel: 'Длительность вращения',
        spinButton: 'Крутить колесо',
        minItemsError: 'Добавьте минимум 2 пункта',
        defaultItems: 'Приз 1\nПриз 2\nПриз 3\nПриз 4\nПриз 5'
    }
};

let currentLanguage = 'en';

function translate(key) {
    const keys = key.split('.');
    let value = translations[currentLanguage];
    
    for (const k of keys) {
        if (typeof value === 'object' && value !== null) {
            value = value[k];
        } else {
            return key;
        }
    }
    
    return typeof value === 'function' ? value : value;
}

function t(key, ...args) {
    let value = translate(key);
    if (typeof value === 'function') {
        return value(...args);
    }
    return value;
}

let items = [];
let currentRotation = 0;
let mode = 'normal';
let isSpinning = false;
let animationId = null;

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const itemsInput = document.getElementById('itemsInput');
const spinButton = document.getElementById('spinButton');
const speedSlider = document.getElementById('speedSlider');
const speedValueDisplay = document.getElementById('speedValueDisplay');
const errorDisplay = document.getElementById('errorDisplay');
const itemsCount = document.getElementById('itemsCount');
const cheatSelectA = document.getElementById('cheatSelectA');
const cheatSelectB = document.getElementById('cheatSelectB');
const modeButtons = document.querySelectorAll('.mode-option');
const resultPopup = document.getElementById('resultPopup');

function getItems() {
    const text = itemsInput.value.trim();
    if (!text) return [];
    return text.split('\n').map(item => item.trim()).filter(item => item.length > 0);
}

function updateItemsCount() {
    items = getItems();
    const count = items.length;
    if (count === 0) {
        itemsCount.textContent = '';
    } else if (count === 1) {
        itemsCount.textContent = t('itemCount.one');
    } else if (currentLanguage === 'ru' && count >= 2 && count <= 4) {
        itemsCount.textContent = t('itemCount.few', count);
    } else {
        itemsCount.textContent = t('itemCount.other', count);
    }
    updateCheatSelects();
}

function updateCheatSelects() {
    const currentA = cheatSelectA.value;
    const currentB = cheatSelectB.value;

    cheatSelectA.innerHTML = `<option value="">${t('fairChoice')}</option>`;
    cheatSelectB.innerHTML = `<option value="">${t('fairChoice')}</option>`;

    items.forEach((item, index) => {
        const optionA = document.createElement('option');
        optionA.value = index;
        optionA.textContent = item;
        cheatSelectA.appendChild(optionA);

        const optionB = document.createElement('option');
        optionB.value = index;
        optionB.textContent = item;
        cheatSelectB.appendChild(optionB);
    });

    if (currentA && items.some((_, i) => String(i) === currentA)) {
        cheatSelectA.value = currentA;
    }
    if (currentB && items.some((_, i) => String(i) === currentB)) {
        cheatSelectB.value = currentB;
    }

    cheatSelectB.style.display = mode === 'elimination' ? 'block' : 'none';
}

function resizeCanvas() {
    const container = document.querySelector('.wheel-container');
    const size = Math.min(container.offsetWidth, container.offsetHeight);
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
}

function drawWheel() {
    items = getItems();
    const count = items.length;
    if (count < 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawEmptyWheel();
        return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const sectorAngle = (2 * Math.PI) / count;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < count; i++) {
        const startAngle = i * sectorAngle - Math.PI / 2;
        const endAngle = startAngle + sectorAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = sectorColors[i % sectorColors.length];
        ctx.fill();

        ctx.strokeStyle = '#49454F';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midAngle = startAngle + sectorAngle / 2;
        const textRadius = radius * 0.65;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;
        
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(midAngle + Math.PI / 2);
        
        const text = items[i];
        const maxTextWidth = radius * 0.45;
        let fontSize = Math.min(radius * 0.12);
        
        ctx.font = `500 ${fontSize}px Roboto, sans-serif`;
        while (ctx.measureText(text).width > maxTextWidth && fontSize > 8) {
            fontSize -= 0.5;
            ctx.font = `500 ${fontSize}px Roboto, sans-serif`;
        }
        
        ctx.fillStyle = '#1C1B1F';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
    }

    drawCenterCircle();
}

function drawEmptyWheel() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#49454F';
    ctx.fill();
    ctx.strokeStyle = '#938F99';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawCenterCircle() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const innerRadius = 50;

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1C1B1F';
    ctx.fill();
    ctx.strokeStyle = '#938F99';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function setWheelRotation(rotation) {
    const container = document.querySelector('.wheel-container');
    container.style.transform = `rotate(${rotation}deg)`;
}

function easeSmoothStartEnd(t) {
    if (t < 0.5) {
        return 2 * t * t;
    } else {
        return 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
}

function spinWheel() {
    items = getItems();
    if (items.length < 2) {
        showError(t('minItemsError'));
        return;
    }

    hideError();
    hideResult();
    isSpinning = true;
    spinButton.disabled = true;
    itemsInput.disabled = true;
    speedSlider.disabled = true;
    modeButtons.forEach(btn => btn.disabled = true);
    canvas.style.cursor = 'default';

    const durationSec = parseInt(speedSlider.value);
    const duration = durationSec * 1000;
    const sectorAngle = 360 / items.length;
    const fullRotations = Math.floor(Math.random() * 4) + 3;
    let targetIndex;

    if (mode === 'elimination') {
        const cheatB = cheatSelectB.value;
        if (cheatB !== '') {
            targetIndex = parseInt(cheatB);
        } else {
            const cheatAContains = [];
            const cheatAVal = cheatSelectA.value;
            if (cheatAVal !== '') {
                cheatAContains.push(parseInt(cheatAVal));
            }
            const availableIndices = items
                .map((_, i) => i)
                .filter(i => !cheatAContains.includes(i));
            targetIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }
    } else {
        const cheatA = cheatSelectA.value;
        if (cheatA !== '') {
            targetIndex = parseInt(cheatA);
        } else {
            targetIndex = Math.floor(Math.random() * items.length);
        }
    }

    const randomSectorOffset = sectorAngle * (0.1 + Math.random() * 0.8);
    

    const itemAngle = (targetIndex * sectorAngle) + randomSectorOffset;
    
    const currentMod = currentRotation % 360;
    const targetMod = 360 - itemAngle;
    
    let rotationDiff = targetMod - currentMod;
    if (rotationDiff <= 0) {
        rotationDiff += 360;
    }
    
    const totalRotation = (fullRotations * 360) + rotationDiff;
    const startRotation = currentRotation;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        const easedT = easeSmoothStartEnd(t);
        const newRotation = startRotation + totalRotation * easedT;
        
        setWheelRotation(newRotation);
        currentRotation = newRotation;
        
        if (t < 1) {
            animationId = requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            spinButton.disabled = false;
            itemsInput.disabled = false;
            speedSlider.disabled = false;
            modeButtons.forEach(btn => btn.disabled = false);
            canvas.style.cursor = 'pointer';
            finishSpin(targetIndex);
        }
    }

    if (duration === 0) {
        setWheelRotation(startRotation + totalRotation);
        currentRotation = startRotation + totalRotation;
        isSpinning = false;
        spinButton.disabled = false;
        itemsInput.disabled = false;
        speedSlider.disabled = false;
        modeButtons.forEach(btn => btn.disabled = false);
        canvas.style.cursor = 'pointer';
        finishSpin(targetIndex);
    } else {
        animationId = requestAnimationFrame(animate);
    }
}

function finishSpin(targetIndex) {
    items = getItems();
    const winner = items[targetIndex];
    showResult(winner);

    if (mode === 'elimination') {
        const newItems = items.filter((_, i) => i !== targetIndex);
        itemsInput.value = newItems.join('\n');
        updateItemsCount();
        drawWheel();
        localStorage.setItem('items', itemsInput.value);
    }
    
    if (cheatSelectB.value !== '') {
        cheatSelectB.value = '';
    }
}

let hideResultTimeout = null;

function showResult(text) {
    if (hideResultTimeout) {
        clearTimeout(hideResultTimeout);
        hideResultTimeout = null;
    }
    resultPopup.textContent = text;
    resultPopup.style.display = 'block';
    resultPopup.classList.remove('hide');
    resultPopup.classList.add('show');
}

function hideResult() {
    resultPopup.classList.remove('show');
    if (resultPopup.style.display === 'block') {
        resultPopup.classList.add('hide');
        hideResultTimeout = setTimeout(() => {
            resultPopup.classList.remove('hide');
            resultPopup.style.display = 'none';
            hideResultTimeout = null;
        }, 300);
    } else {
        resultPopup.style.display = 'none';
    }
}

function showError(text) {
    errorDisplay.textContent = text;
    errorDisplay.classList.add('show');
}

function hideError() {
    errorDisplay.classList.remove('show');
}

function addRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = event.clientY - rect.top - size / 2 + 'px';

    button.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

function handleSpeedChange() {
    const value = speedSlider.value;
    speedValueDisplay.textContent = value + (currentLanguage === 'ru' ? 'с' : 's');
}

function handleModeChange(modeName) {
    mode = modeName;
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === modeName);
    });
    document.querySelector('.mode-switch').dataset.active = modeName;
    updateCheatSelects();
    localStorage.setItem('mode', modeName);
}

itemsInput.addEventListener('input', () => {
    updateItemsCount();
    drawWheel();
    hideError();
    localStorage.setItem('items', itemsInput.value); 
});

const wheelContainer = document.querySelector('.wheel-container');
wheelContainer.addEventListener('click', (e) => {
    if (!isSpinning) {
        spinWheel();
    }
});

spinButton.addEventListener('click', (e) => {
    addRipple(e);
    spinWheel();
});

speedSlider.addEventListener('input', handleSpeedChange);

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => handleModeChange(btn.dataset.mode));
});

cheatSelectA.addEventListener('change', updateCheatSelects);
cheatSelectB.addEventListener('change', updateCheatSelects);

window.addEventListener('resize', () => {
    resizeCanvas();
    drawWheel();
});

function updateUILanguage() {
    document.documentElement.lang = currentLanguage;
    document.title = t('pageTitle');
    
    const panelTitle = document.querySelector('.panel-title');
    panelTitle.textContent = t('panelTitle');
    
    const itemsLabel = document.querySelector('label[for="itemsInput"]');
    itemsLabel.textContent = t('itemsLabel');
    
    itemsInput.placeholder = t('itemsPlaceholder');
    
    updateItemsCount();
    
    const modeLabelText = document.getElementById('modeLabelText');
    if (modeLabelText) {
        modeLabelText.textContent = t('modeLabel');
    }
    
    const modeOptions = document.querySelectorAll('.mode-option');
    if (modeOptions[0]) modeOptions[0].textContent = t('modeNormal');
    if (modeOptions[1]) modeOptions[1].textContent = t('modeElimination');
    
    const speedLabel = document.querySelector('label[for="speedSlider"]');
    if (speedLabel) {
        speedLabel.innerHTML = t('durationLabel');
    }
    
    spinButton.textContent = t('spinButton');
    
    if (itemsInput.value === translations.en.defaultItems || 
        itemsInput.value === translations.ru.defaultItems) {
        itemsInput.value = t('defaultItems');

        drawWheel();
    }

    updateCheatSelects();
    handleSpeedChange();
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ru') return;
    
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    const selector = document.getElementById('languageSelector');
    if (selector) {
        selector.value = lang;
    }
    
    updateUILanguage();
}

// Language
const savedLanguage = localStorage.getItem('language') || 'en';
currentLanguage = savedLanguage;

// Mode

const savedMode = localStorage.getItem('mode') || 'normal';
const modeSwitch = document.querySelector('.mode-switch');

modeSwitch.dataset.active = savedMode;
modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === savedMode);
});
mode = savedMode;
updateCheatSelects();

requestAnimationFrame(() => {
    modeSwitch.classList.add('loaded');
});

// Items

const savedItems = localStorage.getItem('items');
if (savedItems !== null) {
    itemsInput.value = savedItems;
} else {
    itemsInput.value = t('defaultItems');
}

resizeCanvas();
updateItemsCount();
drawWheel();

// Initialize language and UI
const languageSelector = document.getElementById('languageSelector');
if (languageSelector) {
    languageSelector.value = currentLanguage;
}
updateUILanguage();

// Language selector event
if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
}