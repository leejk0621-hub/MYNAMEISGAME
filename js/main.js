/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

// 게임 루프 변수
let lastTime = 0;
let animationId = null;

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 400, // 게임 화면을 위해 크기 키움
      flip: true
    });

    // 2. Stabilizer 초기화 (떨림 방지)
    stabilizer = new PredictionStabilizer({
      threshold: 0.75, // 반응 속도를 위해 임계값 완화
      smoothingFrames: 2 // 반응을 빠르게 하기 위해 프레임 수 축소 (5 -> 2)
    });

    // 3. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 400; // 웹캠 크기에 맞춤
    canvas.height = 400;
    ctx = canvas.getContext("2d");

    // 4. GameEngine 초기화
    gameEngine = new GameEngine();
    gameEngine.init(canvas); // 캔버스 연결

    // 게임 콜백 설정
    gameEngine.onScoreChange = (score, life, level) => {
      // UI 업데이트가 필요하다면 여기에 작성 (현재는 콘솔 로그)
      console.log(`Score: ${score}, Life: ${life}, Level: ${level}`);
    };
    gameEngine.onGameEnd = (score, level) => {
      alert(`게임 오버! 최종 점수: ${score}`);
      stop();
    };

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    // DrawPose는 이제 게임 루프 안에서 처리하므로 별도 콜백 제거 or 유지 선택
    // 여기서는 drawPose 콜백을 제거하고 메인 루프에서 직접 그리기 사용
    poseEngine.setDrawCallback(null);

    // 7. PoseEngine 시작
    poseEngine.start();

    // 8. 게임 시작
    gameEngine.start();
    startGameLoop();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * 게임 루프 (60FPS)
 */
function startGameLoop() {
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // 1. 캔버스 지우기
    ctx.clearRect(0, 0, 400, 400);

    // 2. 웹캠 배경 그리기
    if (poseEngine.webcam && poseEngine.webcam.canvas) {
      ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 400, 400); // 캔버스 크기에 맞춤
    }

    // 3. 포즈 스켈레톤 그리기 (선택 사항)
    // poseEngine 내부에서 pose 데이터를 가져와야 함 (현재 구조상 어려우면 생략 가능)

    // 4. 게임 업데이트 및 그리기
    if (gameEngine) {
      gameEngine.update();
      gameEngine.draw(); // 웹캠 위에 게임 요소 오버레이
    }

    animationId = requestAnimationFrame(loop);
  }
  animationId = requestAnimationFrame(loop);
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (poseEngine) {
    poseEngine.stop();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. 디버깅용 UI 표시
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "자세 잡는 중...";

  // 3. GameEngine에 포즈 전달
  if (gameEngine && stabilized.className) {
    gameEngine.setPose(stabilized.className);
  }
}

// 게임 모드 시작 함수 (필요 없음, init에서 자동 시작)
function startGameMode(config) {
  // Legacy support removal
}
