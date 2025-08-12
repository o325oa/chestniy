/* script.js | Автомобильная Викторина */
/* ================================ */

// 1. Telegram WebApp init (если запускается из Telegram)
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();
    // Применяем тему Telegram к корню документа
    if (tg.colorScheme === "dark") document.documentElement.dataset.theme = "dark";
}

/* -------------------------------
 * Элементы DOM
 * -----------------------------*/
const loadingScreen = q('#loading-screen');
const startScreen   = q('#start-screen');
const gameScreen    = q('#game-screen');
const resultScreen  = q('#result-screen');

// Стартовый экран
const bestScoreEl   = q('#best-score');
const gamesPlayedEl = q('#games-played');
const avgScoreEl    = q('#avg-score');
const startBtn      = q('#start-btn');
const diffButtons   = qa('.difficulty-btn');

// Игровой экран
const currentQEl    = q('#current-question');
const totalQEl      = q('#total-questions');
const currentScoreEl= q('#current-score');
const progressFill  = q('#progress-fill');
const diffBadge     = q('#current-difficulty');
const qText         = q('#question-text');
const qImageWrap    = q('#question-image');
const qImg          = q('#q-img');
const answersWrap   = q('#answers-container');
const hintBtn       = q('#hint-btn');
const skipBtn       = q('#skip-btn');
const nextBtn       = q('#next-btn');
const hintsLeftEl   = q('#hints-left');
const skipsLeftEl   = q('#skips-left');
const timerWrap     = q('#timer-container');
const timerProgress = q('#timer-progress');
const timerText     = q('#timer-text');

// Результаты
const finalScoreEl  = q('#final-score');
const correctAnsEl  = q('#correct-answers');
const timeSpentEl   = q('#time-spent');
const hintsUsedEl   = q('#hints-used');
const resultEmojiEl = q('#result-emoji');
const resultTitleEl = q('#result-title');
const resultMsgEl   = q('#result-message');
const playAgainBtn  = q('#play-again-btn');
const shareBtn      = q('#share-btn');
const homeBtn       = q('#home-btn');

// Модальные окна
const rulesModal    = q('#rules-modal');
const aboutModal    = q('#about-modal');
qs('#rules-btn').addEventListener('click', ()=> openModal(rulesModal));
qs('#about-btn').addEventListener('click', ()=> openModal(aboutModal));
qs('#rules-close').addEventListener('click', ()=> closeModal(rulesModal));
qs('#about-close').addEventListener('click', ()=> closeModal(aboutModal));
window.addEventListener('click', e=>{
    if (e.target.classList.contains('modal')) closeModal(e.target);
});

/* -------------------------------
 * Состояние игры
 * -----------------------------*/
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

/* -------------------------------
 * Инициализация
 * -----------------------------*/
loadStats();
updateDifficultyButtons();
fetch('questions.json')
    .then(res => res.json())
    .then(data => {
        QUESTIONS = data;
        setTimeout(()=> switchScreen(startScreen), 800); // показываем после загрузки
    });

startBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
homeBtn.addEventListener('click', ()=> switchScreen(startScreen));
shareBtn.addEventListener('click', shareResult);

diffButtons.forEach(btn=> btn.addEventListener('click', ()=>{
    diffButtons.forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.difficulty;
    updateDifficultyBadge();
}));

hintBtn.addEventListener('click', useHint);
skipBtn.addEventListener('click', skipQuestion);
nextBtn.addEventListener('click', nextQuestion);

/* -------------------------------
 * Функции игры
 * -----------------------------*/
function startGame(){
    score = 0; correctCount = 0; totalTime = 0; currentIndex = 0;
    hintsLeft = 3; skipsLeft = 2;
    hintsLeftEl.textContent = hintsLeft;
    skipsLeftEl.textContent = skipsLeft;

    // фильтруем по сложности и перемешиваем
    gameQuestions = QUESTIONS.filter(q=> q.level === difficulty)
        .sort(()=>Math.random()-0.5).slice(0,10);
    totalQEl.textContent = gameQuestions.length;
    switchScreen(gameScreen);
    updateDifficultyBadge();
    showQuestion();
}

function showQuestion(){
    clearInterval(timerInterval);
    const q = gameQuestions[currentIndex];
    currentQEl.textContent = currentIndex+1;
    progressFill.style.width = `${(currentIndex)/gameQuestions.length*100}%`;
    currentScoreEl.textContent = score;
    qText.textContent = q.question;

    if (q.image){
        qImg.src = q.image; qImageWrap.style.display='block';
    } else qImageWrap.style.display='none';

    // ответы
    answersWrap.innerHTML='';
    q.answers.forEach((ans,i)=>{
        const btn = document.createElement('button');
        btn.className='answer-btn';
        btn.innerHTML = `<span class="answer-letter">${String.fromCharCode(65+i)}</span> ${ans}`;
        btn.onclick = ()=> selectAnswer(btn,i);
        answersWrap.appendChild(btn);
    });

    // таймер
    let timeLeft = 30;
    timerWrap.style.display='flex';
    updateTimer(timeLeft);
    timerInterval = setInterval(()=>{
        timeLeft--; updateTimer(timeLeft);
        if (timeLeft===0){
            clearInterval(timerInterval);
            lockAnswers();
            setTimeout(nextBtnShow,500);
        }
    },1000);

    nextBtn.style.display='none';
}

function selectAnswer(btn,idx){
    clearInterval(timerInterval);
    const q = gameQuestions[currentIndex];
    const buttons = qa('.answer-btn');
    buttons.forEach(b=> b.disabled=true);

    if (idx === q.correct){
        btn.classList.add('correct');
        score+=10; correctCount++;
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } else {
        btn.classList.add('incorrect');
        buttons[q.correct].classList.add('correct');
        if (tg) tg.HapticFeedback.notificationOccurred('error');
    }
    currentScoreEl.textContent = score;
    setTimeout(nextBtnShow,600);
}

function nextBtnShow(){ nextBtn.style.display='inline-flex'; }
function lockAnswers(){ qa('.answer-btn').forEach(b=> b.disabled=true); }

function nextQuestion(){
    totalTime += 30 - Number(timerText.textContent);
    currentIndex++;
    if (currentIndex >= gameQuestions.length) endGame();
    else showQuestion();
}

function endGame(){
    progressFill.style.width='100%';
    saveStats();
    switchScreen(resultScreen);
    finalScoreEl.textContent = score;
    correctAnsEl.textContent = correctCount;
    hintsUsedEl.textContent = 3 - hintsLeft;
    timeSpentEl.textContent = formatTime(totalTime);
    const {title,msg,emoji}= resultFeedback();
    resultTitleEl.textContent = title;
    resultMsgEl.textContent = msg;
    resultEmojiEl.textContent = emoji;
}

function useHint(){
    if (!hintsLeft) return toast('Нет подсказок','warning');
    const buttons = qa('.answer-btn');
    const q = gameQuestions[currentIndex];
    // Отключаем один неверный вариант
    const wrongIndexes = [...buttons].map((_,i)=>i).filter(i=>i!==q.correct);
    const remove = wrongIndexes[Math.floor(Math.random()*wrongIndexes.length)];
    buttons[remove].disabled=true; buttons[remove].style.opacity=0.4;
    hintsLeft--; hintsLeftEl.textContent = hintsLeft;
}

function skipQuestion(){
    if(!skipsLeft) return toast('Нет пропусков','warning');
    skipsLeft--; skipsLeftEl.textContent=skipsLeft;
    nextQuestion();
}

function shareResult(){
    const text=`Я набрал ${score}/100 баллов в Авто‐викторине! Попробуй и ты!`;
    if (tg){ tg.showPopup({title:'Поделиться',message:text,buttons:[{id:'share',text:'Отправить'},{id:'cancel',type:'cancel'}]},id=>{if(id==='share')tg.sendData(text);}); }
    else if (navigator.share) navigator.share({title:'Авто Викторина',text});
    else navigator.clipboard.writeText(text).then(()=>toast('Скопировано','success'));
}

/* -------------------------------
 * Вспомогательные функции
 * -----------------------------*/
function q(sel){return document.querySelector(sel);}function qa(sel){return document.querySelectorAll(sel);}function qs(sel){return q(sel);} // alias
function switchScreen(screen){ [loadingScreen,startScreen,gameScreen,resultScreen].forEach(s=>s.classList.remove('active')); screen.classList.add('active'); }
function openModal(m){m.style.display='flex';}
function closeModal(m){m.style.display='none';}
function updateTimer(t){ timerText.textContent=t; const offset = 283*(1-t/30); timerProgress.style.strokeDashoffset=offset; }
function updateDifficultyButtons(){ diffButtons.forEach(b=>{b.classList.toggle('active',b.dataset.difficulty===difficulty);}); updateDifficultyBadge(); }
function updateDifficultyBadge(){ const map={easy:['🟢','Легкий'],medium:['🟡','Средний'],hard:['🔴','Сложный']}; const [em,text]=map[difficulty]; diffBadge.innerHTML=`<span class="difficulty-emoji">${em}</span><span class="difficulty-text">${text}</span>`; }
function formatTime(sec){const m=Math.floor(sec/60);const s=sec%60;return `${m}:${s.toString().padStart(2,'0')}`;}
function resultFeedback(){ if(score===100) return {title:'Мастер!',msg:'Вы ответили без ошибок!',emoji:'🏆'}; if(score>=80) return {title:'Отлично!',msg:'Отличный результат!',emoji:'🎉'}; if(score>=60) return {title:'Хорошо',msg:'Хорошие знания!',emoji:'👍'}; return {title:'Попробуйте ещё',msg:'Есть куда расти!',emoji:'📚'}; }
// Toast
function toast(text,type='info',time=3000){ const container=q('#toast-container'); const div=document.createElement('div'); div.className=`toast ${type}`; div.textContent=text; container.appendChild(div); setTimeout(()=>div.remove(),time); }

/* -------------------------------
 * Статистика в LocalStorage
 * -----------------------------*/
function loadStats(){ const s=JSON.parse(localStorage.getItem('autoQuizStats')||'{}'); bestScoreEl.textContent=s.best||0; gamesPlayedEl.textContent=s.games||0; avgScoreEl.textContent=s.avg||0; }
function saveStats(){ const s=JSON.parse(localStorage.getItem('autoQuizStats')||'{}'); s.games=(s.games||0)+1; s.best = Math.max(s.best||0,score); s.total=(s.total||0)+score; s.avg = Math.round(s.total/s.games); localStorage.setItem('autoQuizStats',JSON.stringify(s)); }
