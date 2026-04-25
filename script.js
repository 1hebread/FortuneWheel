const sectorColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

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
const speedValue = document.getElementById('speedValue');
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
    itemsCount.textContent = count === 1 ? '1 пункт' : count >= 2 && count <= 4 ? `${count} пункта` : `${count} пунктов`;
    updateCheatSelects();
}

function updateCheatSelects() {
    const currentA = cheatSelectA.value;
    const currentB = cheatSelectB.value;

    cheatSelectA.innerHTML = '<option value="">Честный выбор</option>';
    cheatSelectB.innerHTML = '<option value="">Честный выбор</option>';

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
        showError('Добавьте минимум 2 пункта');
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
    }
    
    if (cheatSelectB.value !== '') {
        cheatSelectB.value = '';
    }
}

function showResult(text) {
    resultPopup.textContent = text;
    resultPopup.style.display = 'block';
    resultPopup.classList.remove('hide');
    resultPopup.classList.add('show');
}

function hideResult() {
    resultPopup.classList.remove('show');
    resultPopup.classList.add('hide');
    setTimeout(() => {
        resultPopup.classList.remove('hide');
        resultPopup.style.display = 'none';
    }, 300);
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
    speedValue.textContent = value;
    speedValueDisplay.textContent = value + 'с';
}

function handleModeChange(modeName) {
    mode = modeName;
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === modeName);
    });
    document.querySelector('.mode-switch').dataset.active = modeName;
    updateCheatSelects();
    localStorage.setItem('fortuneWheelMode', modeName);
}

itemsInput.addEventListener('input', () => {
    updateItemsCount();
    drawWheel();
    hideError();
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

resizeCanvas();
updateItemsCount();
drawWheel();
handleSpeedChange();

const savedMode = localStorage.getItem('fortuneWheelMode') || 'normal';
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