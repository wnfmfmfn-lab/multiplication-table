/**
 * 쟈니 쌤과 함께하는 구구단 연습 게임
 * 초등학교 2학년 대상
 */

(() => {
  // --- 상태 변수 ---
  const TOTAL_QUESTIONS = 10;
  let currentQuestionIndex = 0; // 0 ~ 9
  let correctCount = 0;
  let currentNumA = 2;
  let currentNumB = 1;
  let isChecking = false; // 중복 제출 방지 플래그
  let previousProblemKey = '';

  // --- 오디오 효과음 (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    try {
      initAudio();
      if (!audioCtx) return;

      if (type === 'correct') {
        // 밝고 경쾌한 딩동댕 화음
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);

          gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.35);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(audioCtx.currentTime + idx * 0.08);
          osc.stop(audioCtx.currentTime + idx * 0.08 + 0.35);
        });
      } else if (type === 'wrong') {
        // 부드럽게 아쉬운 효과음
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, audioCtx.currentTime); // E4
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.3); // A3

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'finish') {
        // 최종 완료 팡파레
        const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);

          gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + idx * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.5);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(audioCtx.currentTime + idx * 0.1);
          osc.stop(audioCtx.currentTime + idx * 0.1 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // --- DOM 요소 ---
  const bodyEl = document.body;
  const themePrincessBtn = document.getElementById('theme-princess-btn');
  const themePrinceBtn = document.getElementById('theme-prince-btn');
  const teacherAvatarEl = document.getElementById('teacher-avatar');
  const teacherSpeechEl = document.getElementById('teacher-speech');
  const questionProgressTextEl = document.getElementById('question-progress-text');
  const currentScoreTextEl = document.getElementById('current-score-text');
  const progressFillEl = document.getElementById('progress-fill');
  const numAEl = document.getElementById('num-a');
  const numBEl = document.getElementById('num-b');
  const answerInputEl = document.getElementById('answer-input');
  const checkBtnEl = document.getElementById('check-btn');
  const answerFormEl = document.getElementById('answer-form');
  const feedbackBadgeEl = document.getElementById('feedback-badge');
  const problemCardEl = document.getElementById('problem-card');
  const quizScreenEl = document.getElementById('quiz-screen');
  const resultScreenEl = document.getElementById('result-screen');
  const resultIconEl = document.getElementById('result-icon');
  const resultScoreEl = document.getElementById('result-score');
  const resultCommentEl = document.getElementById('result-comment');
  const quoteTextEl = document.getElementById('quote-text');
  const restartBtnEl = document.getElementById('restart-btn');

  // --- 테마 전환 ---
  function setTheme(theme) {
    if (theme === 'princess') {
      bodyEl.classList.remove('theme-prince');
      bodyEl.classList.add('theme-princess');
      themePrincessBtn.classList.add('active');
      themePrinceBtn.classList.remove('active');
      teacherAvatarEl.textContent = '👸';
      if (!isChecking && currentQuestionIndex === 0 && correctCount === 0) {
        teacherSpeechEl.textContent = '"안녕! 사랑스러운 핑크 공주 테마야. 같이 신나게 구구단을 풀어볼까?"';
      }
    } else {
      bodyEl.classList.remove('theme-princess');
      bodyEl.classList.add('theme-prince');
      themePrinceBtn.classList.add('active');
      themePrincessBtn.classList.remove('active');
      teacherAvatarEl.textContent = '🤴';
      if (!isChecking && currentQuestionIndex === 0 && correctCount === 0) {
        teacherSpeechEl.textContent = '"안녕! 멋진 하늘 왕자 테마야. 용기 있게 10문제를 정복해보자!"';
      }
    }
  }

  themePrincessBtn.addEventListener('click', () => setTheme('princess'));
  themePrinceBtn.addEventListener('click', () => setTheme('prince'));

  // --- 문제 출제 (2단 ~ 9단 랜덤) ---
  function generateNewProblem() {
    let a, b, key;
    do {
      // 2단부터 9단: Math.floor(Math.random() * 8) + 2
      a = Math.floor(Math.random() * 8) + 2;
      // 곱하는 수 1부터 9까지
      b = Math.floor(Math.random() * 9) + 1;
      key = `${a}x${b}`;
    } while (key === previousProblemKey);

    previousProblemKey = key;
    currentNumA = a;
    currentNumB = b;

    numAEl.textContent = currentNumA;
    numBEl.textContent = currentNumB;
    answerInputEl.value = '';
    feedbackBadgeEl.className = 'feedback-badge';
    feedbackBadgeEl.textContent = '';
    
    // UI 업데이트
    questionProgressTextEl.textContent = `문제 ${currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
    currentScoreTextEl.textContent = `맞은 개수: ${correctCount}개`;
    const progressPercent = ((currentQuestionIndex) / TOTAL_QUESTIONS) * 100;
    progressFillEl.style.width = `${progressPercent}%`;

    teacherSpeechEl.textContent = `"선생님 쟈니 쌤이야! ${currentNumA} × ${currentNumB}의 정답은 무엇일까?"`;

    isChecking = false;
    answerInputEl.disabled = false;
    checkBtnEl.disabled = false;
    answerInputEl.focus();
  }

  // --- 정답 확인 ---
  function checkAnswer() {
    if (isChecking) return;

    const userVal = answerInputEl.value.trim();
    if (userVal === '') {
      teacherSpeechEl.textContent = '"숫자를 입력창에 적고 확인 버튼을 눌러줘!"';
      answerInputEl.focus();
      return;
    }

    isChecking = true;
    answerInputEl.disabled = true;
    checkBtnEl.disabled = true;

    const userAnswer = parseInt(userVal, 10);
    const correctAnswer = currentNumA * currentNumB;

    if (userAnswer === correctAnswer) {
      // 정답인 경우
      correctCount++;
      playSound('correct');
      feedbackBadgeEl.textContent = '🎉 정답!';
      feedbackBadgeEl.className = 'feedback-badge correct';
      problemCardEl.classList.add('pulse-correct');
      setTimeout(() => problemCardEl.classList.remove('pulse-correct'), 500);

      teacherSpeechEl.textContent = `"정답이야! 쟈니 쌤이 아주 기뻐! 정말 잘했어! 👍"`;
    } else {
      // 오답인 경우
      // 요구사항: 오답이면 ‘아쉬워요! 정답은 ___이에요.’라고 알려줘
      playSound('wrong');
      feedbackBadgeEl.textContent = `아쉬워요! 정답은 ${correctAnswer}이에요.`;
      feedbackBadgeEl.className = 'feedback-badge wrong';
      problemCardEl.classList.add('shake');
      setTimeout(() => problemCardEl.classList.remove('shake'), 400);

      teacherSpeechEl.textContent = `"아쉬워요! 정답은 ${correctAnswer}이에요. 다음 문제에서 힘내보자! ✨"`;
    }

    currentScoreTextEl.textContent = `맞은 개수: ${correctCount}개`;

    // 1.8초 뒤 다음 문제로 이동 또는 게임 종료
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < TOTAL_QUESTIONS) {
        generateNewProblem();
      } else {
        finishGame();
      }
    }, 1800);
  }

  // --- 게임 종료 및 결과 화면 ---
  function finishGame() {
    playSound('finish');
    progressFillEl.style.width = '100%';
    questionProgressTextEl.textContent = `문제 10 / 10`;

    quizScreenEl.classList.add('hidden');
    resultScreenEl.classList.remove('hidden');

    // 10개 다 풀면 ‘10개 중 __개 정답!’이라고 보여주고, 칭찬 멘트도 넣어줘.
    // (10개: 완벽해요, 7~9개: 잘했어요, 5~6개: 좋아요, 4개 이하: 다시 도전)
    resultScoreEl.textContent = `10개 중 ${correctCount}개 정답!`;

    let comment = '';
    let teacherQuote = '';
    let icon = '🏆';

    if (correctCount === 10) {
      comment = '완벽해요! 🌟';
      teacherQuote = '"10문제 모두 맞히다니 정말 완벽해! 구구단 박사님으로 인정할게! 👑"';
      icon = '👑';
    } else if (correctCount >= 7) {
      comment = '잘했어요! 👏';
      teacherQuote = '"와, 7개 이상이나 맞혔네! 쟈니 쌤이 정말 자랑스러워! 아주 잘했어!"';
      icon = '🎉';
    } else if (correctCount >= 5) {
      comment = '좋아요! 😊';
      teacherQuote = '"절반 이상을 멋지게 맞혔구나! 조금만 더 연습하면 백점 맞을 수 있어! 파이팅!"';
      icon = '⭐';
    } else {
      comment = '다시 도전! 💪';
      teacherQuote = '"포기하지 않는 마음이 가장 멋져! 쟈니 쌤과 한 번 더 도전해볼까?"';
      icon = '🎈';
    }

    resultIconEl.textContent = icon;
    resultCommentEl.textContent = comment;
    quoteTextEl.textContent = teacherQuote;
    teacherSpeechEl.textContent = `"10문제를 모두 마쳤어! ${resultScoreEl.textContent} ${comment}"`;
  }

  // --- 게임 재시작 ---
  function restartGame() {
    currentQuestionIndex = 0;
    correctCount = 0;
    previousProblemKey = '';
    resultScreenEl.classList.add('hidden');
    quizScreenEl.classList.remove('hidden');
    generateNewProblem();
  }

  // --- 이벤트 바인딩 ---
  answerFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    checkAnswer();
  });

  restartBtnEl.addEventListener('click', restartGame);

  // 초기화 시작 (기본: 핑크 공주 테마)
  setTheme('princess');
  generateNewProblem();
})();
