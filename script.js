```javascript
// script.js | Автомобильная Викторина

// 1. Инициализация Telegram WebApp (если внутри Telegram)
const tg = window.Telegram?.WebApp || null;
if (tg) {
    tg.ready();
    tg.expand();
    if (tg.colorScheme === "dark") {
        document.documentElement.dataset.theme = "dark";
    }
}

// 2. DOM-элементы
const loadingScreen = document.getElementById('loading-screen');
const startScreen   = document.getElementById('start-screen');
const gameScreen    = document.getElementById('game-screen');
const resultScreen  = document.getElementById('result-screen');

const bestScoreEl   = document.getElementById('best-score');
const gamesPlayedEl = document.getElementById('games-played');
const avgScoreEl    = document.getElementById('avg-score');
const startBtn      = document.getElementById('start-btn');
const diffButtons   = document.querySelectorAll('.difficulty-btn');

const currentQEl    = document.getElementById('current-question');
const totalQEl      = document.getElementById('total-questions');
const currentScoreEl= document.getElementById('current-score');
const progressFill  = document.getElementById('progress-fill');
const diffBadge     = document.getElementById('current-difficulty');
const qText         = document.getElementById('question-text');
const qImageWrap    = document.getElementById('question-image');
const qImg          = document.getElementById('q-img');
const answersWrap   = document.getElementById('answers-container');
const hintBtn       = document.getElementById('hint-btn');
const skipBtn       = document.getElementById('skip-btn');
const nextBtn       = document.getElementById('next-btn');
const hintsLeftEl   = document.getElementById('hints-left');
const skipsLeftEl   = document.getElementById('skips-left');
const timerWrap     = document.getElementById('timer-container');
const timerProgress = document.getElementById('timer-progress');
const timerText     = document.getElementById('timer-text');

const finalScoreEl  = document.getElementById('final-score');
const correctAnsEl  = document.getElementById('correct-answers');
const timeSpentEl   = document.getElementById('time-spent');
const hintsUsedEl   = document.getElementById('hints-used');
const resultEmojiEl = document.getElementById('result-emoji');
const resultTitleEl = document.getElementById('result-title');
const resultMsgEl   = document.getElementById('result-message');
const playAgainBtn  = document.getElementById('play-again-btn');
const shareBtn      = document.getElementById('share-btn');
const homeBtn       = document.getElementById('home-btn');

const rulesModal    = document.getElementById('rules-modal');
const aboutModal    = document.getElementById('about-modal');

// 3. Состояние игры
let QUESTIONS = [];
let gameQuestions = [];
let difficulty = 'easy';
let currentIndex = 0;
let score = 0;
let correctCount = 0;
let totalTime = 0;
let timerInterval = null;
let hintsLeft = 3;
let skipsLeft = 2;

// 4. Инициализация
loadStats();
updateDifficultyButtons();

fetch('questions.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    QUESTIONS = data;
  })
  .catch(err => {
    console.error('Ошибка загрузки вопросов:', err);
    alert('Не удалось загрузить базу вопросов. Проверьте файл questions.json');
  })
  .finally(() => {
    setTimeout(() => switchScreen(startScreen), 1000);
  });

// 5. Слушатели событий
startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', () => switchScreen(startScreen));
shareBtn.addEventListener('click', shareResult);

diffButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    diffButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.difficulty;
    updateDifficultyBadge();
  });
});

hintBtn.addEventListener('click', useHint);
skipBtn.addEventListener('click', skipQuestion);
nextBtn.addEventListener('click', nextQuestion);

document.getElementById('rules-btn').addEventListener('click', () => openModal(rulesModal));
document.getElementById('about-btn').addEventListener('click', () => openModal(aboutModal));
document.getElementById('rules-close').addEventListener('click', () => closeModal(rulesModal));
document.getElementById('about-close').addEventListener('click', () => closeModal(aboutModal));
window.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) closeModal(e.target);
});

// 6. Функции игры
function startGame() {
  score = 0; correctCount = 0; totalTime = 0; currentIndex = 0;
  hintsLeft = 3; skipsLeft = 2;
  hintsLeftEl.textContent = hintsLeft;
  skipsLeftEl.textContent = skipsLeft;

  // Формируем набор из 15 вопросов выбранного уровня, дополняем при необходимости
  let pool = QUESTIONS.filter(q => q.level === difficulty);
  if (pool.length  q.level !== difficulty));
  }
  gameQuestions = pool.sort(() => Math.random() - 0.5).slice(0, 15);
  totalQEl.textContent = gameQuestions.length;

  switchScreen(gameScreen);
  updateDifficultyBadge();
  showQuestion();
}

function showQuestion() {
  clearInterval(timerInterval);
  const q = gameQuestions[currentIndex];

  currentQEl.textContent = currentIndex + 1;
  progressFill.style.width = `${(currentIndex) / gameQuestions.length * 100}%`;
  currentScoreEl.textContent = score;

  qText.textContent = q.question;
  if (q.image) {
    qImg.src = q.image;
    qImageWrap.style.display = 'block';
  } else {
    qImageWrap.style.display = 'none';
  }

  answersWrap.innerHTML = '';
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = `${String.fromCharCode(65 + i)} ${ans}`;
    btn.onclick = () => selectAnswer(btn, i);
    answersWrap.appendChild(btn);
  });

  // Таймер на 30 секунд
  let timeLeft = 30;
  timerWrap.style.display = 'flex';
  updateTimer(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer(timeLeft);
    if (timeLeft === 0) {
      clearInterval(timerInterval);
      lockAnswers();
      setTimeout(showNextButton, 500);
    }
  }, 1000);

  nextBtn.style.display = 'none';
}

function selectAnswer(btn, idx) {
  clearInterval(timerInterval);
  const q = gameQuestions[currentIndex];
  const buttons = document.querySelectorAll('.answer-btn');
  buttons.forEach(b => b.disabled = true);

  if (idx === q.correct) {
    btn.classList.add('correct');
    score += 10;
    correctCount++;
    tg?.HapticFeedback.notificationOccurred('success');
  } else {
    btn.classList.add('incorrect');
    buttons[q.correct].classList.add('correct');
    tg?.HapticFeedback.notificationOccurred('error');
  }
  currentScoreEl.textContent = score;
  setTimeout(showNextButton, 600);
}

function showNextButton() {
  nextBtn.style.display = 'inline-flex';
}

function lockAnswers() {
  document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
}

function nextQuestion() {
  clearInterval(timerInterval);
  totalTime += 30 - Number(timerText.textContent);
  currentIndex++;
  if (currentIndex >= gameQuestions.length) {
    endGame();
  } else {
    showQuestion();
  }
}

function endGame() {
  progressFill.style.width = '100%';
  saveStats();
  switchScreen(resultScreen);

  const total = gameQuestions.length;
  const percent = Math.round((correctCount / total) * 100);

  finalScoreEl.textContent = percent + '%';
  correctAnsEl.textContent = correctCount;
  hintsUsedEl.textContent = 3 - hintsLeft;
  timeSpentEl.textContent = formatTime(totalTime);

  const { title, msg, emoji } = resultFeedback(percent);
  resultTitleEl.textContent = title;
  resultMsgEl.textContent = msg;
  resultEmojiEl.textContent = emoji;
}

function useHint() {
  if (!hintsLeft) return toast('Подсказки закончились', 'warning');
  const buttons = document.querySelectorAll('.answer-btn');
  const q = gameQuestions[currentIndex];
  const wrong = Array.from(buttons)
    .map((_, i) => i)
    .filter(i => i !== q.correct);
  const removeIdx = wrong[Math.floor(Math.random() * wrong.length)];
  buttons[removeIdx].disabled = true;
  buttons[removeIdx].style.opacity = 0.4;
  hintsLeft--;
  hintsLeftEl.textContent = hintsLeft;
}

function skipQuestion() {
  if (!skipsLeft) return toast('Пропуски закончились', 'warning');
  skipsLeft--;
  skipsLeftEl.textContent = skipsLeft;
  nextQuestion();
}

function shareResult() {
  const text = `Я набрал ${finalScoreEl.textContent} в Авто-викторине! Попробуй и ты!`;
  if (tg) {
    tg.showPopup({
      title: 'Поделиться результатом',
      message: text,
      buttons: [
        { id: 'share', text: 'Отправить' },
        { id: 'cancel', type: 'cancel', text: 'Отмена' }
      ]
    }, id => {
      if (id === 'share') tg.sendData(text);
    });
  } else if (navigator.share) {
    navigator.share({ title: 'Автомобильная Викторина', text });
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Скопировано в буфер', 'success'));
  }
}

// 7. Вспомогательные функции

function switchScreen(screen) {
  [loadingScreen, startScreen, gameScreen, resultScreen]
    .forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function openModal(modal) {
  modal.style.display = 'flex';
}

function closeModal(modal) {
  modal.style.display = 'none';
}

function updateTimer(sec) {
  timerText.textContent = sec;
  const offset = 283 * (1 - sec / 30);
  timerProgress.style.strokeDashoffset = offset;
}

function updateDifficultyButtons() {
  diffButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.difficulty === difficulty);
  });
  updateDifficultyBadge();
}

function updateDifficultyBadge() {
  const map = {
    easy:   ['🟢', 'Легкий'],
    medium: ['🟡', 'Средний'],
    hard:   ['🔴', 'Сложный']
  };
  const [emoji, text] = map[difficulty];
  diffBadge.innerHTML = `${emoji}${text}`;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function resultFeedback(percent) {
  if (percent === 100) return { title: 'Мастер!', msg: 'Вы ответили без ошибок!', emoji: '🏆' };
  if (percent >= 80)  return { title: 'Отлично!', msg: 'Отличный результат!', emoji: '🎉' };
  if (percent >= 60)  return { title: 'Хорошо', msg: 'Хорошие знания!', emoji: '👍' };
  return { title: 'Попробуйте ещё', msg: 'Есть куда расти!', emoji: '📚' };
}

function toast(text, type='info', duration=3000) {
  const container = document.getElementById('toast-container');
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.textContent = text;
  container.appendChild(div);
  setTimeout(() => div.remove(), duration);
}

// 8. LocalStorage для статистики

function loadStats() {
  const s = JSON.parse(localStorage.getItem('autoQuizStats') || '{}');
  bestScoreEl.textContent   = s.best  || 0;
  gamesPlayedEl.textContent = s.games || 0;
  avgScoreEl.textContent    = s.avg   || 0;
}

function saveStats() {
  const key = 'autoQuizStats';
  const s = JSON.parse(localStorage.getItem(key) || '{}');
  s.games = (s.games || 0) + 1;
  s.best  = Math.max(s.best || 0, correctCount / gameQuestions.length * 100);
  s.total = (s.total || 0) + correctCount / gameQuestions.length * 100;
  s.avg   = Math.round(s.total / s.games);
  localStorage.setItem(key, JSON.stringify(s));
}
```
function loadStats(){ const s=JSON.parse(localStorage.getItem('autoQuizStats')||'{}'); bestScoreEl.textContent=s.best||0; gamesPlayedEl.textContent=s.games||0; avgScoreEl.textContent=s.avg||0; }
function saveStats(){ const s=JSON.parse(localStorage.getItem('autoQuizStats')||'{}'); s.games=(s.games||0)+1; s.best = Math.max(s.best||0,score); s.total=(s.total||0)+score; s.avg = Math.round(s.total/s.games); localStorage.setItem('autoQuizStats',JSON.stringify(s)); }
