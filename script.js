// --- 1. INITIAL SETUP & DOM ELEMENTS ---

// Log a message to the console to ensure the script is linked correctly
console.log('JavaScript file is linked correctly.');

// Get main DOM elements
const startBtn = document.getElementById('start-btn');
const messageOverlay = document.getElementById('charity-message-overlay');
const gameScreen = document.getElementById('game-screen');
const timerDisplay = document.getElementById('game-timer');
const scoreDisplay = document.getElementById('game-score');

// Show Xs for misses (top display)
let xDisplay = document.createElement('div');
xDisplay.id = 'misses-display';
// Move Xs further down to make more space for weather message
xDisplay.style.position = 'absolute';
xDisplay.style.top = '92px'; // moved further down
xDisplay.style.left = '50%';
xDisplay.style.transform = 'translateX(-50%)';
xDisplay.style.fontSize = '2rem';
xDisplay.style.color = '#f5402c';
xDisplay.style.zIndex = '20';
gameScreen && gameScreen.appendChild(xDisplay);

// --- 2. GAME STATE VARIABLES ---

// Set default game time for prototype (will be overridden by setLevel)
let timeLeft = 90; // Default: 1.5 minutes
let timerInterval;
let rainInterval;
let weatherInterval;

let gameActive = false;
let score = 0;

// Keep track of missed raindrops
let misses = 0;

// Make rain a bit faster and more frequent as levels go up
let rainSpeed = 2200;      // How fast drops fall (ms)
let rainFrequency = 1100;  // How often drops appear (ms)
let pointsToWin = 25;      // Game ends at 25 points (default)
let level = 1;             // Default to level 1 (Easy)
let combo = 0;

// Set different combo thresholds for each boost
const comboTimeBoost = 4;    // Every 4 in a row: time boost
const comboPointsBoost = 7;  // Every 7 in a row: points boost
const comboXBoost = 10;      // Every 10 in a row: remove X

let weather = 'normal';
let maxMisses = 3; // Will be set by setLevel
let currentWeatherType = 'normal';

// Store the selected difficulty (default to 'easy')
let difficulty = 'easy';

// --- LEVEL SETTINGS ---
// Each level has its own settings for time, points to win, rain speed, frequency, max misses,
// and how many rain drops will change color when the weather changes.
const levelSettings = {
  1: { // Easy
    name: 'Easy',
    time: 60, // 1 minute
    pointsToWin: 15,
    rainSpeed: 2600,
    rainFrequency: 1500,
    maxMisses: 3,
    colorSwitchChance: 0.25, // Only 25% of drops change color in weather
    weatherChangeInterval: 7000 // Weather changes every 7 seconds
  },
  2: { // Medium
    name: 'Medium',
    time: 40,
    pointsToWin: 25,
    rainSpeed: 2200,
    rainFrequency: 1100,
    maxMisses: 3,
    colorSwitchChance: 0.5, // 50% of drops change color in weather
    weatherChangeInterval: 6000 // Weather changes every 6 seconds
  },
  3: { // Hard
    name: 'Hard',
    time: 60,
    pointsToWin: 35,
    rainSpeed: 1400,
    rainFrequency: 800,
    maxMisses: 3,
    colorSwitchChance: 0.7, // 70% of drops change color in weather
    weatherChangeInterval: 4500 // Weather changes every 4.5 seconds
  },
  4: { // Expert
    name: 'Expert',
    time: 45,
    pointsToWin: 50,
    rainSpeed: 1000,
    rainFrequency: 600,
    maxMisses: 3,
    colorSwitchChance: 0.9, // 90% of drops change color in weather
    weatherChangeInterval: 3500 // Weather changes every 3.5 seconds
  }
};

// Function to set game parameters based on level
function setLevel(lvl) {
  // Set the current level
  level = lvl;

  // Get settings for the selected level, or default to Medium if not found
  const settings = levelSettings[level] || levelSettings[2];

  // Set game rules based on level
  // These values control the challenge and fairness for each level
  timeLeft = settings.time; // How much time the player has
  pointsToWin = settings.pointsToWin; // How many points needed to win
  rainSpeed = settings.rainSpeed; // How fast drops fall (lower = faster)
  rainFrequency = settings.rainFrequency; // How often drops appear (lower = more often)
  maxMisses = settings.maxMisses; // How many Xs (misses) allowed before losing
  window.colorSwitchChance = settings.colorSwitchChance; // How often drops change color in weather

  // Set difficulty string for reference (optional)
  if (level === 1) {
    difficulty = 'easy';
  } else if (level === 2) {
    difficulty = 'medium';
  } else if (level === 3) {
    difficulty = 'hard';
  } else if (level === 4) {
    difficulty = 'expert';
  } else {
    difficulty = 'medium';
  }

  // For debugging: show which level is set and its settings
  console.log(`Level set to: ${settings.name}`);
  console.log(`Time: ${timeLeft}, Points to Win: ${pointsToWin}, Rain Speed: ${rainSpeed}, Rain Frequency: ${rainFrequency}, Max Misses: ${maxMisses}, Color Switch Chance: ${window.colorSwitchChance}`);

  updateLevelDisplay(); // Update the level display on the screen
}

// --- Optionally, update setDifficulty to use setLevel for consistency ---
function setDifficulty(mode) {
  // Map difficulty string to level number
  let lvl = 2; // Default to Medium
  if (mode === 'easy') lvl = 1;
  else if (mode === 'medium') lvl = 2;
  else if (mode === 'hard') lvl = 3;
  else if (mode === 'expert') lvl = 4;

  setLevel(lvl);
}

// --- 3. CONSTANTS FOR COLORS & TYPES ---

const realisticColors = {
  clean: '#4fc3f7',
  dirty: '#bfa97a',
  unknown: '#b0b7c6'
};

let rainColorMap = {
  clean: 'clean',
  dirty: 'dirty',
  unknown: 'unknown'
};

const rainTypes = [
  { type: 'clean', icon: '💧' },
  { type: 'dirty', icon: '🦠' },
  { type: 'unknown', icon: '❓' }
];

// --- 4. TIMER FUNCTIONS ---

// This function starts the timer and the rain for the current level.
// It uses the correct timeLeft, rainFrequency, and rainSpeed for each level.
function startGameTimerAndRain() {
  // Set the timer to the correct value for this level
  timeLeft = levelSettings[level].time;
  // Show the timer in MM:SS format
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Clear any previous intervals
  clearInterval(timerInterval);
  clearInterval(rainInterval);

  // Start the game
  gameActive = true;

  // Start the rain interval using the correct frequency for this level
  rainInterval = setInterval(() => {
    createRainDrop();
  }, levelSettings[level].rainFrequency);

  // Start the timer interval
  timerInterval = setInterval(() => {
    timeLeft--;
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(rainInterval);
      timerDisplay.textContent = '0:00';
      // Play buzzer sound when time runs out
      buzzerAudio.currentTime = 0;
      buzzerAudio.play();
      // End the game if time runs out
      endGame(false);
    }
  }, 1000);
}

// --- 5. WEATHER FUNCTIONS ---

function updateWeatherBackground(type) {
  // Only update the game screen background color, not the starter screen
  const gameScreenDiv = document.getElementById('game-screen');
  const gameSky = document.querySelector('#game-screen .sky-background');
  // Pick a single color for each weather type
  let bgColor = '';
  if (type === 'storm') {
    bgColor = '#5a7ca7'; // Stormy blue-gray
  } else if (type === 'sunny') {
    bgColor = '#87ceeb'; // Bright blue
  } else if (type === 'random') {
    bgColor = '#c471f5'; // Fun purple
  } else {
    bgColor = '#b3e0fc'; // Normal sky blue
  }
  // Set the same solid color for both the sky and the whole game screen
  if (gameSky) {
    gameSky.style.background = bgColor;
  }
  if (gameScreenDiv) {
    gameScreenDiv.style.background = bgColor;
  }
}

// Track the current weather event globally
let currentWeatherEventId = 0;

function startWeatherChanges(customInterval) {
  // Use the interval from levelSettings, or a custom one if provided
  let weatherChangeInterval = levelSettings[level]?.weatherChangeInterval || 7000;
  if (customInterval) weatherChangeInterval = customInterval;

  weatherInterval = setInterval(() => {
    // Pick a new weather type different from the current one
    const weatherTypes = ['normal', 'storm', 'sunny', 'random'];
    let newWeatherType;
    do {
      newWeatherType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    } while (newWeatherType === currentWeatherType);
    currentWeatherType = newWeatherType;
    updateWeatherBackground(currentWeatherType);

    // Set rain speed based on weather and level
    if (currentWeatherType === 'normal') {
      // Normal weather: use the default rain speed for the level
      rainSpeed = levelSettings[level]?.rainSpeed || 2200;
    } else {
      // Weather event: make rain fall faster, but keep it fair and playable
      if (level === 1) {
        rainSpeed = Math.max(2000, (levelSettings[level]?.rainSpeed || 2600) * 0.8); // Easy: not too fast
      } else if (level === 2) {
        rainSpeed = Math.max(1500, (levelSettings[level]?.rainSpeed || 2200) * 0.7); // Medium: a bit faster
      } else if (level === 3) {
        rainSpeed = Math.max(1100, (levelSettings[level]?.rainSpeed || 1400) * 0.65); // Hard: challenging but fair
      } else if (level === 4) {
        rainSpeed = Math.max(900, (levelSettings[level]?.rainSpeed || 1000) * 0.6); // Expert: fast but not impossible
      } else {
        rainSpeed = Math.max(1200, (levelSettings[level]?.rainSpeed || 2200) * 0.7);
      }
    }

    // --- Change ALL raindrop colors when the weather changes (except normal) ---
    if (currentWeatherType !== 'normal') {
      // Get all raindrops on the screen
      const drops = document.querySelectorAll('.rain-drop');
      drops.forEach(drop => {
        // Pick a new type different from the current one
        const currentType = drop.dataset.type;
        const possibleTypes = rainTypes.filter(rt => rt.type !== currentType);
        const newTypeObj = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        drop.dataset.type = newTypeObj.type;
        // Get the new color for the new type
        const newColor = getRainDropColor(newTypeObj.type);
        // Update the SVG to match the new type and color
        const svgDiv = drop.children[1];
        if (svgDiv) {
          svgDiv.innerHTML = `
            <svg width="60" height="80" viewBox="0 0 36 48" style="display:block; pointer-events:none;">
              <path d="M18 4
                C18 4, 4 24, 4 34
                a14 14 0 0 0 28 0
                C32 24, 18 4, 18 4
                Z"
                fill="${newColor}" stroke="#1a1a1a" stroke-width="2"/>
              <ellipse cx="13" cy="20" rx="5" ry="13" fill="#fff" fill-opacity="0.35" />
            </svg>
          `;
        }
        // Update the glow color as well
        const glowDiv = drop.children[0];
        if (glowDiv) {
          glowDiv.style.background = newColor;
        }
      });
    }
    // If weather is normal, do NOT change raindrop colors (they stay the same)

    // --- Show a weather message at the top of the game screen ---
    let oldMsg = document.getElementById('weather-message');
    if (oldMsg) oldMsg.remove();
    let weatherMsg = '';
    if (currentWeatherType === 'storm') {
      weatherMsg = 'Warning: Thunder Storm! Watch out for tricky drops!';
    } else if (currentWeatherType === 'sunny') {
      weatherMsg = 'Sunny skies! Clean water is easier to spot!';
    } else if (currentWeatherType === 'random') {
      weatherMsg = 'Surprise Weather! Anything can happen!';
    } else {
      weatherMsg = 'Normal weather. Stay focused!';
    }
    const msgDiv = document.createElement('div');
    msgDiv.id = 'weather-message';
    msgDiv.textContent = weatherMsg;
    msgDiv.style.position = 'absolute';
    msgDiv.style.top = '12px';
    msgDiv.style.left = '50%';
    msgDiv.style.transform = 'translateX(-50%)';
    msgDiv.style.fontSize = '1.55rem';
    msgDiv.style.fontWeight = 'bold';
    msgDiv.style.color = '#fff';
    msgDiv.style.background = 'rgba(44, 62, 80, 0.88)';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.padding = '12px 28px';
    msgDiv.style.zIndex = '100';
    msgDiv.style.boxShadow = '0 2px 8px #0002';
    msgDiv.style.letterSpacing = '0.5px';
    msgDiv.style.textAlign = 'center';
    msgDiv.style.fontFamily = 'Segoe UI, Arial, sans-serif';
    msgDiv.style.pointerEvents = 'none';
    msgDiv.style.maxWidth = '92vw';
    msgDiv.style.opacity = '0.98';
    if (window.innerWidth < 600) {
      msgDiv.style.fontSize = '1.18rem';
      msgDiv.style.padding = '8px 10px';
      msgDiv.style.top = '6px';
    }
    setTimeout(() => {
      msgDiv.remove();
    }, 4000);
    gameScreen.appendChild(msgDiv);
  }, weatherChangeInterval);
}

// --- Make sure drops are reset properly when the game is reset ---
function resetGame() {
  // Reset score and misses for a new game
  score = 0;
  misses = 0;
  combo = 0;
  // Do NOT reset level, timeLeft, pointsToWin, rainSpeed, rainFrequency here!
  updateScore();
  updateMisses();
  if (scoreDisplay) scoreDisplay.textContent = '0';
  if (timerDisplay) {
    // If on Easy level, always show 1:00
    if (level === 1) {
      timerDisplay.textContent = '1:00';
    } else {
      let minutes = Math.floor(levelSettings[level].time / 60);
      let seconds = levelSettings[level].time % 60;
      timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  }
  // Set background to normal while charity message is on display
  updateWeatherBackground('normal');
  document.querySelectorAll('.rain-drop').forEach(drop => drop.remove());

  // Always reset rainColorMap to default (no color switching)
  rainColorMap = {
    clean: 'clean',
    dirty: 'dirty',
    unknown: 'unknown'
  };
  // Set currentWeatherType to normal so drops don't switch colors
  currentWeatherType = 'normal';
  // Remove all rain drops from the screen
  document.querySelectorAll('.rain-drop').forEach(drop => drop.remove());
}

// --- 6. HELPERS FOR DROPS & BUCKETS ---

function getRainDropColor(type) {
  return realisticColors[rainColorMap[type]];
}

function getCurrentBucket(type) {
  return type;
}

function getRandomRainType() {
  return rainTypes[Math.floor(Math.random() * rainTypes.length)];
}

function getRandomX() {
  const bucketsRow = document.querySelector('.game-screen .buckets-row') || document.querySelector('.buckets-row');
  if (bucketsRow) {
    const rowRect = bucketsRow.getBoundingClientRect();
    const min = rowRect.left + 10;
    const max = rowRect.right - 70;
    return Math.floor(Math.random() * (max - min)) + min;
  } else {
    const min = 40;
    const max = window.innerWidth - 100;
    return Math.floor(Math.random() * (max - min)) + min;
  }
}

function shuffleRainColorMap() {
  const types = ['clean', 'dirty', 'unknown'];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  rainColorMap.clean = types[0];
  rainColorMap.dirty = types[1];
  rainColorMap.unknown = types[2];
}

// --- 7. RAIN DROP CREATION & ANIMATION ---

function createRainDrop() {
  // Debug: Check if the game is active before creating a drop
  console.log('createRainDrop called. gameActive:', gameActive);
  if (!gameActive) return;

  let rainType = getRandomRainType();
  let color = getRainDropColor(rainType.type);

  // Create the rain drop container
  const drop = document.createElement('div');
  drop.className = `rain-drop rain-${rainType.type}`;
  drop.dataset.type = rainType.type;
  drop.style.position = 'absolute';
  drop.style.top = '-40px';
  drop.style.left = `${getRandomX()}px`;
  drop.style.width = '60px';
  drop.style.height = '80px';
  drop.style.background = 'transparent';
  drop.style.cursor = 'grab';
  drop.style.zIndex = '12';
  drop.style.display = 'block';
  drop.style.userSelect = 'none';
  drop.style.pointerEvents = 'auto';
  drop.style.border = 'none';
  drop.style.boxShadow = 'none';
  drop._handled = false; // This helps us count each drop only once
  // --- New: When a drop is created, check if it should change color for the current weather event ---
  if (currentWeatherType !== 'normal') {
    // Give each new drop a random chance to change color, just like existing drops
    let changeChance = 0.5; // Default
    if (level === 1) changeChance = 0.3;
    if (level === 2) changeChance = 0.5;
    if (level === 3) changeChance = 0.7;
    if (level === 4) changeChance = 0.9;
    if (Math.random() < changeChance) {
      // Pick a new type different from the current one
      const currentType = drop.dataset.type;
      const possibleTypes = rainTypes.filter(rt => rt.type !== currentType);
      const newTypeObj = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
      drop.dataset.type = newTypeObj.type;
      color = getRainDropColor(newTypeObj.type);
    }
    // Mark this drop with the current weather event
    drop._lastWeatherEventId = currentWeatherEventId;
  } else {
    drop._lastWeatherEventId = 0;
  }

  // --- Add a circular glow element (hidden by default) ---
  const glow = document.createElement('div');
  glow.className = 'rain-glow';
  glow.style.position = 'absolute';
  glow.style.top = '-15px';
  glow.style.left = '-15px';
  glow.style.width = '90px';
  glow.style.height = '110px';
  glow.style.borderRadius = '50%';
  glow.style.background = `${color}`;
  glow.style.opacity = '0.35';
  glow.style.filter = `blur(12px)`;
  glow.style.pointerEvents = 'none';
  glow.style.zIndex = '1';
  glow.style.display = 'none'; // Only show on hover/click

  // --- Add the SVG for the drop (SVG has pointer-events: none) ---
  const svg = document.createElement('div');
  // Only show the main drop shape and color, no extra detail
  svg.innerHTML = `
    <svg width="60" height="80" viewBox="0 0 36 48" style="display:block; pointer-events:none;">
      <path d="M18 4
        C18 4, 4 24, 4 34
        a14 14 0 0 0 28 0
        C32 24, 18 4, 18 4
        Z"
        fill="${color}" stroke="#1a1a1a" stroke-width="2"/>
      <ellipse cx="13" cy="20" rx="5" ry="13" fill="#fff" fill-opacity="0.35" />
    </svg>
  `;
  svg.style.position = 'relative';
  svg.style.zIndex = '2';

  // --- Show the glow on hover or click ---
  drop.addEventListener('mouseenter', function() {
    glow.style.display = 'block';
  });
  drop.addEventListener('mouseleave', function() {
    glow.style.display = 'none';
  });
  drop.addEventListener('mousedown', function() {
    glow.style.display = 'block';
    // Hide the glow after 200ms if not dragging
    setTimeout(() => {
      if (!drop.style.cursor.includes('grabbing')) {
        glow.style.display = 'none';
      }
    }, 200);
  });

  // --- Compose the drop: glow behind, SVG in front ---
  drop.appendChild(glow);
  drop.appendChild(svg);

  // Make the drop draggable
  makeDraggable(drop);

  // Animate the drop falling
  // Make rain drops fall a bit faster and more often as level increases
  // (for challenge, but not impossible)
  let speed = Math.max(900, rainSpeed - (level - 1) * 200);
  animateRainDropRainy(drop, rainSpeed);

  // Add the drop to the game screen
  gameScreen.appendChild(drop);

  // Debug: Log to confirm drop was added
  console.log('Rain drop added to DOM:', drop);
}

function animateRainDropRainy(drop, speed) {
  let start = Date.now();
  let from = -80;
  let to = window.innerHeight - 200;
  const origLeft = parseInt(drop.style.left, 10);
  const driftDir = Math.random() > 0.5 ? 1 : -1;
  const driftAmount = Math.random() * 30;

  function fall() {
    if (!gameActive) {
      drop.remove();
      return;
    }
    let now = Date.now();
    let elapsed = now - start;
    let percent = elapsed / speed;
    let y = from + (to - from) * percent;
    drop.style.top = `${y}px`;
    // Drift a little as it falls, but mostly straight down
    let drift = Math.sin(percent * Math.PI) * driftAmount * driftDir;
    drop.style.left = `${origLeft + drift}px`;

    // Only count as missed if the drop reaches the ground and was NOT dropped by the player
    if (percent < 1) {
      drop._falling = requestAnimationFrame(fall);
    } else {
      drop._falling = null;
      // Only call dropMissed if the drop is still in the DOM (not already removed by drag/drop)
      if (document.body.contains(drop) && !drop._handled) {
        drop._handled = true; // Mark this drop as handled
        dropMissed(drop);     // Count the miss
      } else if (!document.body.contains(drop)) {
        // Drop was already handled by another event (like drag/drop)
        // Do nothing
      } else {
        // If it lands on a bucket or sign, just remove it (no penalty)
        drop.remove();
      }
    }
  }
  drop._falling = requestAnimationFrame(fall);
}

// --- 8. DRAG & DROP LOGIC ---

function makeDraggable(drop) {
  // Variables to track dragging state
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  // When mouse is pressed down on the drop
  drop.onmousedown = function(e) {
    e.preventDefault();
    if (!gameActive) return;

    dragging = true;
    drop.style.zIndex = '100';
    drop.style.cursor = 'grabbing';
    drop._dragging = true; // <--- Add this line

    // *** Stop the falling animation when dragging starts ***
    if (drop._falling) {
      cancelAnimationFrame(drop._falling);
      drop._falling = null;
    }

    // Calculate the offset between mouse and drop's top-left corner
    offsetX = e.clientX - drop.offsetLeft;
    offsetY = e.clientY - drop.offsetTop;

    // Listen for mouse movement on the whole document
    document.onmousemove = function(e) {
      if (!dragging) return;
      // Move the drop to follow the mouse
      drop.style.left = `${e.clientX - offsetX}px`;
      drop.style.top = `${e.clientY - offsetY}px`;
    };

    // When mouse is released
    document.onmouseup = function(e) {
      if (!dragging) return;
      dragging = false;
      drop.style.cursor = 'grab';
      drop.style.boxShadow = `0 4px 16px ${drop.style.background}88`;
      drop._dragging = false; // <--- Add this line
      document.onmousemove = null;
      document.onmouseup = null;
      drop._isDragging = false; // Not dragging anymore
      // Only check for bucket drop, do not call dropMissed here
      checkDropInBucket(drop, true);
    };
  };

  // Touch support
  drop.ontouchstart = function(e) {
    e.preventDefault();
    if (!gameActive) return;

    dragging = true;
    drop.style.zIndex = '100';
    drop.style.cursor = 'grabbing';
    drop._dragging = true; // <--- Add this line

    // *** Stop the falling animation when dragging starts (touch) ***
    if (drop._falling) {
      cancelAnimationFrame(drop._falling);
      drop._falling = null;
    }

    const touch = e.touches[0];
    offsetX = touch.clientX - drop.offsetLeft;
    offsetY = touch.clientY - drop.offsetTop;

    document.ontouchmove = function(e) {
      if (!dragging) return;
      const touch = e.touches[0];
      drop.style.left = `${touch.clientX - offsetX}px`;
      drop.style.top = `${touch.clientY - offsetY}px`;
    };

    document.ontouchend = function(e) {
      if (!dragging) return;
      dragging = false;
      drop.style.cursor = 'grab';
      drop.style.boxShadow = `0 4px 16px ${drop.style.background}88`;
      drop._dragging = false; // <--- Add this line
      document.ontouchmove = null;
      document.ontouchend = null;
      drop._isDragging = false; // Not dragging anymore
      checkDropInBucket(drop, true);
    };
  };

  drop.onclick = function() {
    // For beginners: show a message when clicked
    // alert(`You clicked a ${drop.dataset.type} drop! Try dragging it to a bucket.`);
    // You can show a message in the UI instead, or just do nothing.
  };
}

// This function checks if a raindrop was dropped into a bucket.
// It prevents double-counting by using drop._handled.
function checkDropInBucket(drop, isPlayerDrop) {
  // If this drop was already handled, do nothing (prevents double-counting Xs)
  if (drop._handled) return;
  if (!gameActive) return;
  drop.style.transition = 'box-shadow 0.2s';
  drop.style.zIndex = '12';
  drop.style.pointerEvents = 'auto';
  drop.style.userSelect = 'auto';
  drop.style.display = 'block';
  const buckets = document.querySelectorAll('.game-screen .bucket');
  let placed = false;
  buckets.forEach(bucket => {
    const rect = bucket.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();
    if (
      dropRect.left + dropRect.width / 2 > rect.left &&
      dropRect.left + dropRect.width / 2 < rect.right &&
      dropRect.top + dropRect.height / 2 > rect.top &&
      dropRect.top + dropRect.height / 2 < rect.bottom
    ) {
      // If the drop is in the correct bucket, score a point (no X)
      if (bucket.classList.contains(`bucket-${getCurrentBucket(drop.dataset.type)}`)) {
        scorePoint(drop);
        drop._handled = true; // Mark as handled after scoring
      } else {
        // If the drop is in the wrong bucket, add an X
        dropWrong(drop);
        drop._handled = true; // Mark as handled after wrong drop
      }
      placed = true;
    }
  });
  // If the drop was not placed in any bucket and was dropped by the player, count as missed
  if (!placed && isPlayerDrop && !drop._handled) {
    drop._handled = true; // Mark as handled
    dropMissed(drop);     // Count the miss (add an X)
  }
}

// --- 9. SOUND EFFECTS ---

// Use a buzzer sound for mistakes and timer running out
const buzzerAudio = new Audio('img/buzzer-or-wrong-answer-20582.mp3'); // Buzzer sound for X or time out
const bellAudio = new Audio('img/servant-bell-ring-2-211683.mp3');   // Bell sound for correct bucket

// --- 10. SCORING, BOOSTS, AND MISTAKES ---

// Milestone scores and messages
const milestones = [
  { score: 5, message: 'Great job! 5 points reached!' },
  { score: 10, message: 'Awesome! 10 points milestone!' },
  { score: 15, message: 'Halfway there! 15 points!' },
  { score: 20, message: 'Keep going! 20 points!' },
  { score: 25, message: 'Amazing! 25 points milestone!' },
  { score: 35, message: 'Incredible! 35 points milestone!' },
  { score: 50, message: 'You did it! 50 points milestone!' }
];

// Helper to show milestone message
function showMilestoneMessage(msg) {
  const milestoneDiv = document.createElement('div');
  milestoneDiv.textContent = msg;
  milestoneDiv.style.position = 'absolute';
  milestoneDiv.style.top = '160px';
  milestoneDiv.style.left = '50%';
  milestoneDiv.style.transform = 'translateX(-50%)';
  milestoneDiv.style.fontSize = '2rem';
  milestoneDiv.style.color = '#2E9DF7';
  milestoneDiv.style.background = '#fff8';
  milestoneDiv.style.borderRadius = '12px';
  milestoneDiv.style.padding = '8px 24px';
  milestoneDiv.style.zIndex = '40';
  milestoneDiv.style.fontWeight = 'bold';
  milestoneDiv.style.boxShadow = '0 2px 8px #0002';
  gameScreen.appendChild(milestoneDiv);
  setTimeout(() => milestoneDiv.remove(), 1800);
}

function scorePoint(drop) {
  score++;
  combo++;
  updateScore();
  // Check for milestone
  milestones.forEach(milestone => {
    if (score === milestone.score) {
      showMilestoneMessage(milestone.message);
    }
  });
  const buckets = document.querySelectorAll('.game-screen .bucket');
  buckets.forEach(bucket => {
    if (bucket.classList.contains(`bucket-${getCurrentBucket(drop.dataset.type)}`)) {
      const originalBg = bucket.style.backgroundColor;
      bucket.style.backgroundColor = '#4FCB53';
      // Play bell sound when correct drop is made
      bellAudio.currentTime = 0;
      bellAudio.play();
      setTimeout(() => {
        bucket.style.backgroundColor = '';
      }, 700);
    }
  });
  // Combo boosts: each has its own threshold
  if (combo > 0 && combo % comboTimeBoost === 0) {
    addTimeBoost();
  } else if (combo > 0 && combo % comboPointsBoost === 0) {
    addPointsBoost();
  } else if (combo > 0 && combo % comboXBoost === 0) {
    removeXBoost();
  }

  drop.remove();

  // Only end the game with a win if the score is enough AND time is left
  if (score >= pointsToWin && timeLeft > 0) {
    endGame(true);
  }
}

function addTimeBoost() {
  // Get the timer before the boost
  let timerText = document.getElementById('game-timer').textContent;
  let parts = timerText.split(':');
  let seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);

  // Remove any previous time boost visual
  let oldBoost = document.getElementById('timer-boost-visual');
  if (oldBoost) oldBoost.remove();

  // Place time boost visual below weather message
  const boostDiv = document.createElement('span');
  boostDiv.id = 'timer-boost-visual';
  boostDiv.style.position = 'absolute';
  boostDiv.style.top = '60px';
  boostDiv.style.left = '50%';
  boostDiv.style.transform = 'translateX(-50%)';
  boostDiv.style.fontSize = '2.1rem';
  boostDiv.style.fontWeight = 'bold';
  boostDiv.style.color = '#159A48';
  boostDiv.style.display = 'inline-flex';
  boostDiv.style.alignItems = 'center';
  boostDiv.style.transition = 'opacity 0.3s';
  boostDiv.style.background = 'rgba(255,255,255,0.92)';
  boostDiv.style.borderRadius = '16px';
  boostDiv.style.padding = '10px 22px';
  boostDiv.style.boxShadow = '0 2px 12px #0002';
  boostDiv.style.zIndex = '99';

  // --- Adjust vertical position if other boosts are visible ---
  if (document.getElementById('bonus-points-visual')) {
    boostDiv.style.top = '30px';
  }
  if (document.getElementById('x-boost-visual')) {
    boostDiv.style.top = '0px';
  }

  boostDiv.innerHTML = `
    <span style="font-size:2.2rem; margin-right:8px;">⏱️</span>
    <span style="margin-right:8px;">+3</span>
    <span id="timer-boost-math" style="margin-left:8px; color:#222; font-size:1.2rem;"></span>
    <span style="margin-left:12px; font-size:1rem; color:#555;">(Time Boost!)</span>
  `;

  gameScreen.appendChild(boostDiv);

  // Show the math: current time + 3, then update to new time
  const mathSpan = boostDiv.querySelector('#timer-boost-math');
  if (mathSpan) {
    let min = Math.floor(seconds / 60);
    let sec = seconds % 60;
    mathSpan.textContent = `(${min}:${sec < 10 ? '0' : ''}${sec} + 3)`;
  }

  // After 1.2 seconds, add the 3 seconds and update the timer visually
  setTimeout(() => {
    let newSeconds = seconds + 3;
    let minutes = Math.floor(newSeconds / 60);
    let secs = newSeconds % 60;
    timerDisplay.textContent = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    if (mathSpan) {
      mathSpan.textContent = `= ${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    // Fade out the visual after a short delay
    setTimeout(() => {
      boostDiv.style.opacity = '0';
      setTimeout(() => {
        boostDiv.remove();
      }, 400);
    }, 900);
  }, 1200);
}

function addPointsBoost() {
  // Find the score tracker (where the score is displayed)
  const scoreTracker = document.querySelector('.score-tracker');
  if (!scoreTracker) return;

  // Remove any previous bonus visual if it exists
  let oldBonus = document.getElementById('bonus-points-visual');
  if (oldBonus) oldBonus.remove();

  // Place points boost visual below time boost
  const bonusDiv = document.createElement('span');
  bonusDiv.id = 'bonus-points-visual';
  bonusDiv.style.position = 'absolute';
  bonusDiv.style.top = '110px';
  bonusDiv.style.left = '50%';
  bonusDiv.style.transform = 'translateX(-50%)';
  bonusDiv.style.fontSize = '2.1rem';
  bonusDiv.style.fontWeight = 'bold';
  bonusDiv.style.color = '#2E9DF7';
  bonusDiv.style.display = 'inline-flex';
  bonusDiv.style.alignItems = 'center';
  bonusDiv.style.transition = 'opacity 0.3s';
  bonusDiv.style.background = 'rgba(255,255,255,0.92)';
  bonusDiv.style.borderRadius = '16px';
  bonusDiv.style.padding = '10px 22px';
  bonusDiv.style.boxShadow = '0 2px 12px #0002';
  bonusDiv.style.zIndex = '98';

  // --- Adjust vertical position if other boosts are visible ---
  if (document.getElementById('timer-boost-visual')) {
    bonusDiv.style.top = '110px';
  }
  if (document.getElementById('x-boost-visual')) {
    bonusDiv.style.top = '140px';
  }

  bonusDiv.innerHTML = `
    <svg width="32" height="40" viewBox="0 0 28 36" style="margin-right:8px;">
      <path d="M14 2 C14 2, 2 18, 2 26 a12 12 0 0 0 24 0 C26 18, 14 2, 14 2 Z"
        fill="#4fc3f7" stroke="#1a1a1a" stroke-width="1.5"/>
      <ellipse cx="10" cy="15" rx="3" ry="7" fill="#fff" fill-opacity="0.35" />
    </svg>
    <span style="margin-right:8px;">+5</span>
    <span id="bonus-score-math" style="margin-left:8px; color:#222; font-size:1.2rem;"></span>
    <span style="margin-left:12px; font-size:1rem; color:#555;">(Bonus Combo!)</span>
  `;

  gameScreen.appendChild(bonusDiv);

  const mathSpan = bonusDiv.querySelector('#bonus-score-math');
  if (mathSpan) {
    mathSpan.textContent = `(${score} + 5)`;
  }

  // After 1.2 seconds, add the 5 points and update the score visually
  setTimeout(() => {
    score += 5;
    updateScore();
    if (mathSpan) {
      mathSpan.textContent = `= ${score}`;
    }
    // Only end the game with a win if the score is enough AND time is left
    if (score >= pointsToWin && timeLeft > 0) {
      endGame(true);
    }
    setTimeout(() => {
      bonusDiv.style.opacity = '0';
      setTimeout(() => {
        bonusDiv.remove();
      }, 400);
    }, 900);
  }, 1200);
}

function removeXBoost() {
  const xDisplay = document.getElementById('misses-display');
  if (!xDisplay) return;

  let oldX = document.getElementById('x-boost-visual');
  if (oldX) oldX.remove();

  // Place X boost visual below points boost
  const xDiv = document.createElement('span');
  xDiv.id = 'x-boost-visual';
  xDiv.style.position = 'absolute';
  xDiv.style.top = '160px';
  xDiv.style.left = '50%';
  xDiv.style.transform = 'translateX(-50%)';
  xDiv.style.fontSize = '2.1rem';
  xDiv.style.fontWeight = 'bold';
  xDiv.style.color = '#F5402C';
  xDiv.style.display = 'inline-flex';
  xDiv.style.alignItems = 'center';
  xDiv.style.transition = 'opacity 0.3s';
  xDiv.style.background = 'rgba(255,255,255,0.92)';
  xDiv.style.borderRadius = '16px';
  xDiv.style.padding = '10px 22px';
  xDiv.style.boxShadow = '0 2px 12px #0002';
  xDiv.style.zIndex = '97';

  // --- Adjust vertical position if other boosts are visible ---
  if (document.getElementById('timer-boost-visual') && document.getElementById('bonus-points-visual')) {
    xDiv.style.top = '200px';
  } else if (document.getElementById('timer-boost-visual') || document.getElementById('bonus-points-visual')) {
    xDiv.style.top = '180px';
  }

  xDiv.innerHTML = `
    <span style="font-size:2.2rem; margin-right:8px;">❌</span>
    <span style="margin-right:8px;">-1</span>
    <span style="margin-left:8px; color:#222; font-size:1.2rem;">(Mistake Removed!)</span>
  `;

  gameScreen.appendChild(xDiv);

  // After 1.2 seconds, remove an X if the player has any,
  // but do NOT end the game here even if misses drops below 3.
  setTimeout(() => {
    if (misses > 0) {
      misses--; // Actually remove an X
      updateMisses();
    }
    setTimeout(() => {
      xDiv.style.opacity = '0';
      setTimeout(() => {
        xDiv.remove();
      }, 400);
    }, 900);
  }, 1200);
}

// --- 11. UI FEEDBACK (COMBO, X, ETC) ---

function showComboMessage(msg) {
  const comboMsg = document.createElement('div');
  comboMsg.textContent = msg;
  comboMsg.style.position = 'absolute';
  comboMsg.style.top = '120px';
  comboMsg.style.left = '50%';
  comboMsg.style.transform = 'translateX(-50%)';
  comboMsg.style.fontSize = '2rem';
  comboMsg.style.color = '#4FCB53';
  comboMsg.style.background = '#fff8';
  comboMsg.style.borderRadius = '12px';
  comboMsg.style.padding = '8px 24px';
  comboMsg.style.zIndex = '30';
  gameScreen.appendChild(comboMsg);
  setTimeout(() => comboMsg.remove(), 1200);
}

function showXOnBucket(bucket) {
  const xMark = document.createElement('div');
  xMark.textContent = '❌';
  xMark.style.position = 'absolute';
  xMark.style.top = '10px';
  xMark.style.left = '50%';
  xMark.style.transform = 'translateX(-50%)';
  xMark.style.fontSize = '2.5rem';
  xMark.style.color = '#f5402c';
  xMark.style.pointerEvents = 'none';
  xMark.style.zIndex = '50';
  bucket.appendChild(xMark);
  setTimeout(() => xMark.remove(), 1200);
}

function showXAtDrop(drop) {
  const xMark = document.createElement('div');
  xMark.textContent = '❌';
  xMark.style.position = 'absolute';
  xMark.style.left = drop.style.left;
  xMark.style.top = `${window.innerHeight - 180}px`;
  xMark.style.fontSize = '2.5rem';
  xMark.style.color = '#f5402c';
  xMark.style.pointerEvents = 'none';
  xMark.style.zIndex = '50';
  gameScreen.appendChild(xMark);
  setTimeout(() => xMark.remove(), 1200);
}

// --- 12. DROP OUTCOMES ---

function dropWrong(drop) {
  if (drop._handled) return; // Already counted this drop
  drop._handled = true;      // Mark as handled

  misses++;                  // Add an X
  combo = 0;                 // Reset combo
  updateMisses();            // Update the X display
  // Play buzzer sound for wrong bucket
  buzzerAudio.currentTime = 0;
  buzzerAudio.play();
  const buckets = document.querySelectorAll('.game-screen .bucket');
  buckets.forEach(bucket => {
    const rect = bucket.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();
    if (
      dropRect.left + dropRect.width / 2 > rect.left &&
      dropRect.left + dropRect.width / 2 < rect.right &&
      dropRect.top + dropRect.height / 2 > rect.top &&
      dropRect.top + dropRect.height / 2 < rect.bottom
    ) {
      showXOnBucket(bucket);
    }
  });
  drop.remove();
  if (misses >= maxMisses) {
    endGame(false);
  }
}

function dropMissed(drop) {
  misses++;
  combo = 0;
  updateMisses();
  // Play buzzer sound for missed drop
  buzzerAudio.currentTime = 0;
  buzzerAudio.play();
  showXAtDrop(drop);
  drop.remove();
  if (misses >= maxMisses) {
    endGame(false);
  }
}

// --- 13. SCORE & MISTAKE DISPLAY ---

function updateScore() {
  if (scoreDisplay) scoreDisplay.textContent = score;
}

function updateMisses() {
  if (xDisplay) {
    // Show one ❌ for each miss
    xDisplay.textContent = '❌'.repeat(misses);

    // Make the Xs bigger if player lost
    if (misses >= 3) {
      xDisplay.style.left = '50%';
      xDisplay.style.transform = 'translateX(-50%)';
      xDisplay.style.fontSize = '2.5rem';
      xDisplay.style.top = '102px';
    } else {
      xDisplay.style.left = '50%';
      xDisplay.style.transform = 'translateX(-50%)';
      xDisplay.style.fontSize = '2rem';
      xDisplay.style.top = '92px';
    }
  }
}

// --- CURRENT SCORE TRACKER (for each level) ---

// Helper to get the best score for the current level from localStorage
function getBestScoreForLevel(level) {
  // Use a unique key for each level
  const key = `bestScore_level_${level}`;
  // Get the value from localStorage, or 0 if not set
  return parseInt(localStorage.getItem(key)) || 0;
}

// Helper to set the best score for the current level in localStorage
function setBestScoreForLevel(level, score) {
  const key = `bestScore_level_${level}`;
  localStorage.setItem(key, score);
}

// Create the current score tracker element
const currentScoreTracker = document.createElement('div');
currentScoreTracker.id = 'current-score-tracker';
// Style it to appear under the score tracker, spaced out and no word break
currentScoreTracker.style.position = 'absolute';
currentScoreTracker.style.top = '105px';
currentScoreTracker.style.left = '50%';
currentScoreTracker.style.transform = 'translateX(-50%)';
currentScoreTracker.style.fontSize = '1.2rem';
currentScoreTracker.style.color = '#2E9DF7';
currentScoreTracker.style.background = 'rgba(255,255,255,0.92)';
currentScoreTracker.style.borderRadius = '8px';
currentScoreTracker.style.padding = '8px 32px';
currentScoreTracker.style.zIndex = '22';
currentScoreTracker.style.fontFamily = 'Segoe UI, Arial, sans-serif';
currentScoreTracker.style.textAlign = 'center';
currentScoreTracker.style.boxShadow = '0 2px 8px #0001';
currentScoreTracker.style.display = 'none'; // Hidden by default
currentScoreTracker.style.whiteSpace = 'nowrap';

// Add the tracker to the game screen under the score tracker
if (gameScreen && scoreDisplay) {
  scoreDisplay.parentNode.insertBefore(currentScoreTracker, scoreDisplay.nextSibling);
}

// Helper to update the current score tracker display
function updateCurrentScoreTracker() {
  // Only show if the game is active and not won
  if (gameActive && score < pointsToWin) {
    // Get the best score for the current level
    const bestScore = getBestScoreForLevel(level);
    currentScoreTracker.style.display = 'block';
    currentScoreTracker.textContent = `Best Score (Level ${level}): ${bestScore}`;
  } else {
    currentScoreTracker.style.display = 'none';
  }
}

// Helper to check and update the best score after a game ends
function checkAndUpdateBestScore() {
  // Only update if the player beat their best score
  const bestScore = getBestScoreForLevel(level);
  if (score > bestScore) {
    setBestScoreForLevel(level, score);
  }
  updateCurrentScoreTracker();
}

// --- Patch into game flow: show/hide and update tracker at the right times ---

// Show tracker when game starts
const originalStartGameAfterMessage = startGameAfterMessage;
startGameAfterMessage = function() {
  updateCurrentScoreTracker();
  originalStartGameAfterMessage();
};

// Update tracker on score change
const originalUpdateScore = updateScore;
updateScore = function() {
  originalUpdateScore();
  updateCurrentScoreTracker();
};

// When the game ends, update the best score and hide tracker if player wins
const originalEndGame = endGame;
endGame = function(win) {
  checkAndUpdateBestScore();
  if (win) {
    currentScoreTracker.style.display = 'none';
  }
  originalEndGame(win);
};

// When resetting the game, show the tracker again
const originalResetGame = resetGame;
resetGame = function() {
  originalResetGame();
  updateCurrentScoreTracker();
};

// When level changes, show the best score for the new level
const originalSetLevel = setLevel;
setLevel = function(lvl) {
  originalSetLevel(lvl);
  updateCurrentScoreTracker();
};

// --- 14. GAME LOOP & LEVEL ---

function startRain() {
  gameActive = true;
  // As level increases, more drops and faster
  let freq = Math.max(400, rainFrequency - (level - 1) * 100);
  rainInterval = setInterval(() => {
    // More drops per interval as level increases
    let numDrops = Math.min(5, 2 + Math.floor(level / 2));
    for (let i = 0; i < numDrops; i++) {
      createRainDrop();
    }
  }, freq);
}

function stopRain() {
  clearInterval(rainInterval);
  clearInterval(weatherInterval);
  gameActive = false;
  document.querySelectorAll('.rain-drop').forEach(drop => drop.remove());
}

// --- 15. END GAME & RESET ---

// This function ends the game and shows the correct overlay.
function endGame(win) {
  // Only allow a win if the score is at least the points needed for this level
  if (win && score < pointsToWin) {
    return; // Not enough points to win
  }

  // Stop rain and timers
  stopRain();
  clearInterval(timerInterval);
  clearInterval(weatherInterval);

  // Hide overlays first
  const winOverlay = document.getElementById('win-overlay');
  const loseOverlay = document.getElementById('lose-overlay');
  if (winOverlay) winOverlay.classList.add('hidden');
  if (loseOverlay) loseOverlay.classList.add('hidden');

  // --- WIN: If player wins on Expert level, show the win overlay ---
  if (win && level === 4) {
    if (winOverlay) winOverlay.classList.remove('hidden');
    // Play Again button
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
      playAgainBtn.onclick = function() {
        winOverlay.classList.add('hidden');
        resetGame();
        setLevel(1); // Restart at level 1
        startWeatherChanges();
        startGameTimerAndRain();
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('starter-screen').classList.add('hidden');
      };
    }
    // Quit button
    const quitBtn = document.getElementById('quit-btn');
    if (quitBtn) {
      quitBtn.onclick = function() {
        winOverlay.classList.add('hidden');
        resetGame();
        document.getElementById('starter-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
      };
    }
    return;
  }

  // --- WIN: If player wins on any other level, show next level overlay (same layout as message overlay) ---
  if (win && level < 4) {
    // Pause the game by stopping rain and timer
    stopRain();
    clearInterval(timerInterval);
    clearInterval(weatherInterval);

    const nextLevelOverlay = document.getElementById('next-level-overlay');
    if (nextLevelOverlay) {
      nextLevelOverlay.classList.remove('hidden');
      // Set up Quit button
      const quitBtnNext = document.getElementById('quit-btn-next');
      if (quitBtnNext) {
        quitBtnNext.onclick = function() {
          nextLevelOverlay.classList.add('hidden');
          resetGame();
          document.getElementById('starter-screen').classList.remove('hidden');
          document.getElementById('game-screen').classList.add('hidden');
        };
      }
      // Wait 5 seconds, then move to next level if overlay is still visible
      setTimeout(function() {
        // Only move to next level if overlay is still visible (not quit)
        if (!nextLevelOverlay.classList.contains('hidden')) {
          nextLevelOverlay.classList.add('hidden');
          setLevel(level + 1);
          resetGame();
          startWeatherChanges();
          startGameTimerAndRain();
          document.getElementById('game-screen').classList.remove('hidden');
          document.getElementById('starter-screen').classList.add('hidden');
        }
      }, 5000);
    }
    return;
  }

  // --- LOSE: Show overlay if player loses (gets too many Xs) ---
  if (!win) {
    if (loseOverlay) loseOverlay.classList.remove('hidden');
    // Play Again button
    const playAgainBtnLose = document.getElementById('play-again-btn-lose');
    if (playAgainBtnLose) {
      playAgainBtnLose.onclick = function() {
        loseOverlay.classList.add('hidden');
        resetGame();
        setLevel(level);
        startWeatherChanges();
        startGameTimerAndRain();
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('starter-screen').classList.add('hidden');
      };
    }
    // Quit button
    const quitBtnLose = document.getElementById('quit-btn-lose');
    if (quitBtnLose) {
      quitBtnLose.onclick = function() {
        loseOverlay.classList.add('hidden');
        resetGame();
        document.getElementById('starter-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
      };
    }
    return;
  }
}

// --- 16. GAME START HANDLING ---

// This function starts the game after showing the message overlay
function startGameAfterMessage() {
  // Always reset game state and background before starting a new game
  resetGame();
  setLevel(level);
  startWeatherChanges();
  startGameTimerAndRain();
}

// --- LEVEL FUNCTIONS FOR AUTOMATIC PROGRESSION ---
// Each function sets up the game for a specific level and starts it.
// When the player wins, the next level starts automatically.

// Easy Level (now matches other levels' logic)
function easyLevel() {
  setLevel(1); // Set to Easy
  resetGame();
  // Always set timer to 1:00 for Easy level
  if (timerDisplay) {
    timerDisplay.textContent = '1:00';
  }
  startWeatherChanges();
  startGameTimerAndRain();
  // No custom endGame override for Easy, use default
}

// Medium Level
function mediumLevel() {
  setLevel(2); // Set to Medium
  resetGame();
  startWeatherChanges();
  startGameTimerAndRain();
  // You can add a custom endGame override if you want auto-progression
}

// Hard Level (Level 3) - Adjusted for better balance
function hardLevel() {
  setLevel(3); // Set to Hard
  resetGame();
  // Start weather changes with a slightly longer interval for balance
  startWeatherChanges(7000); // 7 seconds between weather changes
  startGameTimerAndRain();
  // You can add a custom endGame override if you want auto-progression
}

// Expert Level (Level 4) - Adjusted for better balance
function expertLevel() {
  setLevel(4); // Set to Expert
  resetGame();
  // Start weather changes with a longer interval for balance
  startWeatherChanges(9000); // 9 seconds between weather changes
  startGameTimerAndRain();
  // You can add a custom endGame override if you want auto-progression
}

// When the start button is clicked, show the game screen and the message overlay
if (startBtn && messageOverlay) {
  startBtn.onclick = function() {
    // Hide the starter screen
    document.getElementById('starter-screen').classList.add('hidden');
    // Show the game screen
    document.getElementById('game-screen').classList.remove('hidden');
    // Show the charity: water message overlay (with logo and message)
    messageOverlay.classList.remove('hidden');
    // Make sure the overlay is visible and not transparent
    messageOverlay.style.backgroundColor = 'rgba(0,0,0,0.65)';
    // --- Reset game state and background while overlay is visible ---
    resetGame();
    // Always set timer to Easy level time (1:00) during the overlay
    if (timerDisplay) {
      timerDisplay.textContent = '1:00'; // Always show 1:00 for Easy
    }
    // Wait 8 seconds, then hide the message and start the game
    setTimeout(function() {
      // Hide the message overlay (but keep its content for next time)
      messageOverlay.classList.add('hidden');
      // Set game screen background to normal at game start
      currentWeatherType = 'normal';
      updateWeatherBackground(currentWeatherType);
      // Always reset game state and background before starting
      resetGame();
      // Start at Easy level
      easyLevel();
    }, 8000); // 8000 milliseconds = 8 seconds
  };
}

// --- Update the current level display on the game screen ---
function updateLevelDisplay() {
  // Get the level display element
  const levelDisplay = document.getElementById('current-level-display');
  // Get the name for the current level
  let levelName = 'Easy';
  if (level === 1) levelName = 'Easy';
  else if (level === 2) levelName = 'Medium';
  else if (level === 3) levelName = 'Hard';
  else if (level === 4) levelName = 'Expert';
  // Set the text
  if (levelDisplay) {
    levelDisplay.textContent = `Level: ${levelName}`;
  }
}

