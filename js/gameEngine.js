/**
 * gameEngine.js
 * Fruit Catcher 게임의 핵심 로직을 담당합니다.
 * - 상태 관리: READY, PLAYING, GAME_OVER
 * - 엔티티 관리: 플레이어(바구니), 아이템(과일/폭탄)
 * - 루프: update(), draw()
 */

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;

    // 게임 상태
    this.state = "READY"; // READY, PLAYING, GAME_OVER
    this.score = 0;
    this.life = 3;
    this.level = 1;

    // 게임 설정
    this.lanes = [0, 1, 2]; // Left, Center, Right (x좌표는 캔버스 크기에 비례하여 계산)
    this.laneCount = 3;

    // 엔티티
    this.playerLane = 1; // 0: Left, 1: Center, 2: Right (초기값: Center)
    this.items = []; // 떨어지는 아이템 배열

    // 아이템 생성 타이머
    this.spawnTimer = 0;
    this.spawnInterval = 120; // 프레임 단위 (약 2초)

    // 아이템 속도
    this.baseSpeed = 2.0;

    // 콜백
    this.onGameEnd = null;
    this.onScoreChange = null;
  }

  /**
   * 게임 엔진 초기화
   * @param {HTMLCanvasElement} canvas 
   */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  /**
   * 게임 시작
   */
  start() {
    this.state = "PLAYING";
    this.score = 0;
    this.life = 3;
    this.level = 1;
    this.items = [];
    this.spawnTimer = 0;
    this.baseSpeed = 2.0;
    this.playerLane = 1;

    // UI 초기화 이벤트 발생
    if (this.onScoreChange) this.onScoreChange(this.score, this.life, this.level);

    console.log("Game Started: Fruit Catcher");
  }

  /**
   * 게임 종료
   */
  gameOver() {
    this.state = "GAME_OVER";
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * 포즈 입력 처리 (외부에서 호출)
   * @param {string} poseLabel - "Left", "Center", "Right"
   */
  setPose(poseLabel) {
    if (this.state !== "PLAYING") return;

    // 대소문자 무시하고 처리
    const label = poseLabel.toUpperCase();

    if (label === "LEFT") {
      this.playerLane = 0;
    } else if (label === "CENTER") {
      this.playerLane = 1;
    } else if (label === "RIGHT") {
      this.playerLane = 2;
    }
  }

  /**
   * 메인 게임 루프 (프레임마다 호출)
   */
  update() {
    if (this.state !== "PLAYING") return;

    // 1. 아이템 생성
    this.spawnTimer++;
    if (this.spawnTimer > Math.max(20, this.spawnInterval - (this.level * 10))) {
      this.spawnItem();
      this.spawnTimer = 0;
    }

    // 2. 아이템 이동 및 충돌 처리
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      // 이동
      item.y += item.speed;

      // 충돌 감지 (플레이어와 같은 라인이고, y좌표가 바구니 위치 근처일 때)
      // 바구니는 바닥 근처에 위치 (예: 화면 높이의 80~90%)
      const playerY = this.canvas.height * 0.85;
      const hitRange = 30; // 충돌 허용 범위

      if (
        item.lane === this.playerLane &&
        item.y >= playerY - hitRange &&
        item.y <= playerY + hitRange
      ) {
        this.handleCollision(item);
        this.items.splice(i, 1);
        continue;
      }

      // 화면 밖으로 나감 (Miss)
      if (item.y > this.canvas.height) {
        this.items.splice(i, 1);
        // 과일 놓쳐도 패널티 없음 (기획대로)
      }
    }
  }

  spawnItem() {
    const lane = Math.floor(Math.random() * this.laneCount);
    const type = this.getRandomItemType();

    this.items.push({
      lane: lane,
      y: -50, // 화면 위에서 시작
      type: type, // 'apple', 'banana', 'gold', 'bomb'
      speed: this.baseSpeed + (Math.random() * 0.5) // 속도 약간 랜덤
    });
  }

  getRandomItemType() {
    const rand = Math.random();
    if (rand < 0.1) return "gold";   // 10%
    if (rand < 0.3) return "bomb";   // 20%
    if (rand < 0.6) return "banana"; // 30%
    return "apple";                  // 40%
  }

  handleCollision(item) {
    let scoreDelta = 0;

    switch (item.type) {
      case "apple":
        scoreDelta = 100;
        break;
      case "banana":
        scoreDelta = 200;
        break;
      case "gold":
        scoreDelta = 500;
        break;
      case "bomb":
        this.life--;
        // 폭탄 맞으면 깜빡이는 효과 등 추가 가능
        break;
    }

    this.score += scoreDelta;

    // 레벨업 (1000점 마다)
    this.level = 1 + Math.floor(this.score / 1000);
    this.baseSpeed = 2.0 + (this.level - 1) * 0.5;

    // UI 업데이트 요청
    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.life, this.level);
    }

    if (this.life <= 0) {
      this.gameOver();
    }
  }

  /**
   * 화면 그리기
   */
  draw() {
    if (!this.ctx || !this.canvas) return;

    // 1. 레인 그리기 (배경 가이드)
    const laneWidth = this.canvas.width / this.laneCount;

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 2;
    for (let i = 1; i < this.laneCount; i++) {
      const x = i * laneWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // 2. 플레이어(바구니) 그리기
    const playerX = (this.playerLane * laneWidth) + (laneWidth / 2);
    const playerY = this.canvas.height * 0.85;

    this.ctx.fillStyle = "#FFDD00"; // 바구니 색상
    this.ctx.beginPath();
    this.ctx.arc(playerX, playerY, 20, 0, Math.PI * 2); // 임시로 원형 바구니
    this.ctx.fill();
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.fillText("ME", playerX, playerY + 5);

    // 3. 아이템 그리기
    for (const item of this.items) {
      const x = (item.lane * laneWidth) + (laneWidth / 2);
      const y = item.y;

      let emoji = "🍎";
      if (item.type === "banana") emoji = "🍌";
      if (item.type === "gold") emoji = "🌟";
      if (item.type === "bomb") emoji = "💣";

      this.ctx.font = "30px Arial";
      this.ctx.fillText(emoji, x, y);
    }

    // 4. 게임 오버 텍스트
    if (this.state === "GAME_OVER") {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = "white";
      this.ctx.font = "30px Arial";
      this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.font = "15px Arial";
      this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
  }
}

// 전역으로 내보내기
window.GameEngine = GameEngine;
