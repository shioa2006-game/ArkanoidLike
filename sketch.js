const WIDTH = 800;
const HEIGHT = 600;
const BASE_PADDLE_WIDTH = 96;
const PADDLE_HEIGHT = 16;
const BALL_RADIUS = 6;
const POWERUP_TYPES = ["EXPAND", "SHRINK", "SLOW", "MULTI", "STICKY"];
const EFFECT_DURATIONS = {
  EXPAND: 12,
  SHRINK: 12,
  SLOW: 8,
  STICKY: 10
};

let scene = "menu";
let score = 0;
let lives = 3;
let stageIndex = 0;

let paddle;
let balls = [];
let bricks = [];
let powerups = [];

let effectPools = {
  expand: [],
  shrink: [],
  slow: 0,
  sticky: 0
};

let pointerState = {
  active: false,
  x: WIDTH / 2
};

let inputState = {
  left: false,
  right: false
};

let slowMultiplier = 1;
let debugDraw = false;
let clearTimer = 0;

/**
 * 上方向へ飛ぶ角度に制限する。
 * @param {number} rad 入力角（ラジアン）
 * @returns {number} 制限後の角度（ラジアン）
 */
function clampUpwardAngle(rad) {
  let deg = degrees(rad);
  deg = ((deg + 180) % 360) - 180;
  const clamped = clamp(deg, -160, -20);
  return radians(clamped);
}

/**
 * パドル中心からのオフセットを角度に変換する。
 * @param {number} offset 正規化済みオフセット（-1〜1）
 * @returns {number} 発射角（ラジアン）
 */
function computeLaunchAngle(offset = 0) {
  const clamped = clamp(offset, -1, 1);
  const angleDeg = clamp(-90 + clamped * 70, -160, -20);
  return clampUpwardAngle(radians(angleDeg));
}

/**
 * ゲームの初期化を行う。
 */
function initGame() {
  score = 0;
  lives = 3;
  stageIndex = 0;
  effectPools = {
    expand: [],
    shrink: [],
    slow: 0,
    sticky: 0
  };
  slowMultiplier = 1;
  pointerState.active = false;
  pointerState.x = WIDTH / 2;
  inputState.left = false;
  inputState.right = false;
  paddle = new Paddle(WIDTH / 2, HEIGHT - 40, BASE_PADDLE_WIDTH, PADDLE_HEIGHT, WIDTH);
  balls = [];
  bricks = [];
  powerups = [];
  spawnBall(true);
  scene = "menu";
}

/**
 * ステージを読み込み、プレイ開始する。
 */
function startGame() {
  score = 0;
  lives = 3;
  stageIndex = 0;
  loadStage(stageIndex);
  resetBallsOnPaddle();
  scene = "play";
}

/**
 * 指定ステージを構築する。
 * @param {number} index ステージ番号
 */
function loadStage(index) {
  const level = LEVELS[index % LEVELS.length];
  bricks = [];
  powerups = [];
  const brickWidth = level.cellW - 8;
  const brickHeight = level.cellH - 8;

  for (let row = 0; row < level.rows; row += 1) {
    const line = level.map[row] || "";
    for (let col = 0; col < level.cols; col += 1) {
      const type = line[col] || " ";
      if (type === " ") {
        continue;
      }
      const x = level.offsetX + col * level.cellW;
      const y = level.offsetY + row * level.cellH;
      bricks.push(new Brick(x, y, brickWidth, brickHeight, type, col, row));
    }
  }
}

/**
 * 新しいボールを生成する。
 * @param {boolean} stick パドルに貼り付けるか
 * @param {number} [angleRad] 発射角
 * @returns {Ball} 生成したボール
 */
function spawnBall(stick, angleRad) {
  const ball = new Ball(paddle.x, paddle.y - paddle.h / 2 - BALL_RADIUS - 2, BALL_RADIUS);
  ball.launchFrom(paddle);
  if (!stick) {
    const launchAngle = typeof angleRad === "number"
      ? clampUpwardAngle(angleRad)
      : computeLaunchAngle(randRange(-0.3, 0.3));
    ball.release(launchAngle);
  }
  balls.push(ball);
  return ball;
}

/**
 * ボールを全てパドル上に戻す。
 */
function resetBallsOnPaddle() {
  balls = [];
  spawnBall(true);
}

/**
 * ステージクリア後の処理。
 */
function advanceStage() {
  stageIndex += 1;
  if (stageIndex >= LEVELS.length) {
    scene = "win";
    return;
  }
  loadStage(stageIndex);
  resetBallsOnPaddle();
  scene = "play";
}

function setup() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  canvas.parent("game-container");
  rectMode(CENTER);
  textFont("Segoe UI");
  initGame();
}

function draw() {
  const dt = min(1 / 30, deltaTime / 1000);
  background(16, 24, 32);

  if (scene === "play") {
    updateGame(dt);
    renderGame();
  } else if (scene === "pause") {
    renderGame();
    drawPauseOverlay();
  } else if (scene === "menu") {
    renderGame();
    drawMenu();
  } else if (scene === "clear") {
    renderGame();
    clearTimer -= dt;
    drawClearOverlay();
    if (clearTimer <= 0) {
      advanceStage();
    }
  } else if (scene === "over") {
    renderGame();
    drawGameOver();
  } else if (scene === "win") {
    renderGame();
    drawWin();
  }
}

/**
 * ゲーム進行を更新する。
 * @param {number} dt deltaTime
 */
function updateGame(dt) {
  updateEffects(dt);
  updatePaddle(dt);
  updateBalls(dt);
  updatePowerups(dt);
  checkStageClear();
}

/**
 * パドル位置を更新する。
 * @param {number} dt deltaTime
 */
function updatePaddle(dt) {
  let targetX = paddle.x;
  if (inputState.left && !inputState.right) {
    targetX -= paddle.speed * dt;
  } else if (inputState.right && !inputState.left) {
    targetX += paddle.speed * dt;
  }

  if (pointerState.active) {
    const pointerTarget = clamp(pointerState.x, paddle.w / 2, WIDTH - paddle.w / 2);
    targetX = lerp(targetX, pointerTarget, 0.35);
  }

  paddle.update(targetX);
}

/**
 * ボール群を更新し、衝突を処理する。
 * @param {number} dt deltaTime
 */
function updateBalls(dt) {
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    const ball = balls[i];

    if (ball.stuck) {
      ball.x = paddle.x;
      ball.y = paddle.y - paddle.h / 2 - ball.r - 2;
      continue;
    }

    ball.update(dt, slowMultiplier);

    // 左右壁
    if (ball.x - ball.r <= 0) {
      ball.x = ball.r;
      ball.reflect(1, 0);
    } else if (ball.x + ball.r >= WIDTH) {
      ball.x = WIDTH - ball.r;
      ball.reflect(-1, 0);
    }

    // 上壁
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.reflect(0, 1);
    }

    // パドル
    if (ball.vy > 0 && circleRectHit(ball.x, ball.y, ball.r, paddle.x, paddle.y, paddle.w, paddle.h).hit) {
      const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
      const angleRad = computeLaunchAngle(offset);
      ball.y = paddle.y - paddle.h / 2 - ball.r - 2;
      if (isStickyActive()) {
        ball.launchFrom(paddle);
      } else {
        ball.setAngle(angleRad);
      }
    }

    // ブロック
    handleBallBrickCollisions(ball);

    // 落下
    if (ball.y - ball.r > HEIGHT) {
      balls.splice(i, 1);
    }
  }

  if (balls.length === 0) {
    handleLifeLost();
  }
}

/**
 * ブロックとの衝突を処理する。
 * @param {Ball} ball 対象ボール
 */
function handleBallBrickCollisions(ball) {
  for (let j = 0; j < bricks.length; j += 1) {
    const brick = bricks[j];
    if (!brick.alive) {
      continue;
    }
    const hitInfo = circleRectHit(ball.x, ball.y, ball.r, brick.x, brick.y, brick.w, brick.h);
    if (!hitInfo.hit) {
      continue;
    }

    ball.reflect(hitInfo.nx, hitInfo.ny);
    const result = brick.hit();
    if (result.score > 0) {
      score += result.score;
    }

    if (result.destroyed) {
      maybeDropPowerup(brick);
    }

    if (result.triggerExplosion) {
      triggerExplosion(brick);
    }

    break;
  }
}

/**
 * パワーアップの生成判定を行う。
 * @param {Brick} brick 元ブロック
 */
function maybeDropPowerup(brick) {
  const dropChance = 0.1;
  if (Math.random() > dropChance) {
    return;
  }
  if (powerups.length >= 6) {
    return;
  }
  const type = POWERUP_TYPES[Math.floor(randRange(0, POWERUP_TYPES.length))];
  powerups.push(new Powerup(brick.x, brick.y, type));
}

/**
 * 爆発ダメージを発生させる。
 * @param {Brick} origin 起点ブロック
 */
function triggerExplosion(origin) {
  for (let i = 0; i < bricks.length; i += 1) {
    const target = bricks[i];
    if (!target.alive || target === origin) {
      continue;
    }
    if (Math.abs(target.gridX - origin.gridX) <= 1 && Math.abs(target.gridY - origin.gridY) <= 1) {
      const result = target.hit(true);
      if (result.score > 0) {
        score += result.score;
      }
      if (result.destroyed) {
        maybeDropPowerup(target);
      }
    }
  }
}

/**
 * パワーアップを更新する。
 * @param {number} dt deltaTime
 */
function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const item = powerups[i];
    item.update(dt);
    if (!item.active) {
      continue;
    }
    if (item.y - item.h / 2 > HEIGHT) {
      powerups.splice(i, 1);
      continue;
    }
    if (aabbOverlap(item.x, item.y, item.w, item.h, paddle.x, paddle.y, paddle.w, paddle.h)) {
      applyPowerup(item.type);
      powerups.splice(i, 1);
    }
  }
}

/**
 * パワーアップ効果を適用する。
 * @param {string} type 効果種別
 */
function applyPowerup(type) {
  switch (type) {
    case "EXPAND":
      effectPools.expand.push(EFFECT_DURATIONS.EXPAND);
      recalcPaddleScale();
      break;
    case "SHRINK":
      effectPools.shrink.push(EFFECT_DURATIONS.SHRINK);
      recalcPaddleScale();
      break;
    case "SLOW":
      effectPools.slow = EFFECT_DURATIONS.SLOW;
      slowMultiplier = 0.75;
      break;
    case "MULTI":
      spawnExtraBalls();
      break;
    case "STICKY":
      effectPools.sticky = Math.max(effectPools.sticky, EFFECT_DURATIONS.STICKY);
      break;
  }
}

/**
 * パドル幅を再計算する。
 */
function recalcPaddleScale() {
  const expandStacks = effectPools.expand.length;
  const shrinkStacks = effectPools.shrink.length;
  const scale = clamp(Math.pow(1.5, expandStacks) * Math.pow(0.75, shrinkStacks), 0.5, 2);
  paddle.setScale(scale);
}

/**
 * 複数ボールを生成する。
 */
function spawnExtraBalls() {
  if (balls.length === 0) {
    spawnBall(true);
    return;
  }
  const availableSlots = Math.max(0, 5 - balls.length);
  const spawnCount = Math.min(2, availableSlots);
  for (let i = 0; i < spawnCount; i += 1) {
    const source = balls[i % balls.length];
    const clone = new Ball(source.x, source.y, BALL_RADIUS);
    clone.stuck = false;
    const baseAngle = Math.atan2(source.vy, source.vx);
    const offset = radians(randRange(-20, 20));
    const newAngle = clampUpwardAngle(baseAngle + offset);
    clone.setAngle(newAngle);
    balls.push(clone);
  }
}

/**
 * エフェクト時間を更新する。
 * @param {number} dt deltaTime
 */
function updateEffects(dt) {
  let needScaleUpdate = false;

  if (effectPools.expand.length > 0) {
    effectPools.expand = effectPools.expand
      .map((time) => time - dt)
      .filter((time) => time > 0);
    needScaleUpdate = true;
  }

  if (effectPools.shrink.length > 0) {
    effectPools.shrink = effectPools.shrink
      .map((time) => time - dt)
      .filter((time) => time > 0);
    needScaleUpdate = true;
  }

  if (needScaleUpdate) {
    recalcPaddleScale();
  }

  if (effectPools.slow > 0) {
    effectPools.slow -= dt;
    if (effectPools.slow <= 0) {
      effectPools.slow = 0;
      slowMultiplier = 1;
    }
  }

  if (effectPools.sticky > 0) {
    effectPools.sticky -= dt;
    if (effectPools.sticky <= 0) {
      effectPools.sticky = 0;
    }
  }
}

/**
 * ステージクリア判定を行う。
 */
function checkStageClear() {
  const remaining = bricks.some((brick) => brick.alive && brick.type !== "U");
  if (!remaining && bricks.length > 0 && scene === "play") {
    scene = "clear";
    clearTimer = 2.5;
  }
}

/**
 * 残機処理を行う。
 */
function handleLifeLost() {
  lives -= 1;
  if (lives <= 0) {
    scene = "over";
    return;
  }
  resetBallsOnPaddle();
}

/**
 * 現在のゲームを描画する。
 */
function renderGame() {
  push();
  rectMode(CENTER);
  for (let i = 0; i < bricks.length; i += 1) {
    bricks[i].draw(debugDraw);
  }
  paddle.draw();
  for (let i = 0; i < balls.length; i += 1) {
    balls[i].draw(debugDraw);
  }
  for (let i = 0; i < powerups.length; i += 1) {
    powerups[i].draw();
  }
  pop();
  drawUI();

  if (debugDraw) {
    drawDebugInfo();
  }
}

/**
 * スコアなどのUIを描画する。
 */
function drawUI() {
  push();
  fill(240);
  textAlign(LEFT, TOP);
  textSize(18);
  text(`スコア: ${score}`, 16, 16);
  textAlign(RIGHT, TOP);
  text(`残機: ${lives}`, WIDTH - 16, 16);
  textAlign(CENTER, TOP);
  const stageLabel = stageIndex < LEVELS.length ? `ステージ: ${stageIndex + 1}/${LEVELS.length}` : "ステージ: -";
  text(stageLabel, WIDTH / 2, 16);
  pop();
}

/**
 * メニュー画面を描く。
 */
function drawMenu() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("スペースキーまたはクリックでスタート", WIDTH / 2, HEIGHT / 2 - 40);
  textSize(18);
  text("←/→ もしくは A/D で移動・スペース/クリックで発射\nP ポーズ・R リスタート・T デバッグ表示", WIDTH / 2, HEIGHT / 2 + 20);
  pop();
}

/**
 * ポーズ画面を描く。
 */
function drawPauseOverlay() {
  push();
  fill(255, 255, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("ポーズ中", WIDTH / 2, HEIGHT / 2);
  textSize(16);
  text("Space で再開 / Esc でメニュー", WIDTH / 2, HEIGHT / 2 + 40);
  pop();
}

/**
 * クリア画面を描く。
 */
function drawClearOverlay() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("ステージクリア!", WIDTH / 2, HEIGHT / 2);
  textSize(16);
  text("次のステージを準備中...", WIDTH / 2, HEIGHT / 2 + 40);
  pop();
}

/**
 * ゲームオーバー画面を描く。
 */
function drawGameOver() {
  push();
  fill(255, 90, 90);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("ゲームオーバー", WIDTH / 2, HEIGHT / 2 - 30);
  fill(255);
  textSize(18);
  text("Space で再挑戦 / Esc でメニュー", WIDTH / 2, HEIGHT / 2 + 20);
  pop();
}

/**
 * 全クリア画面を描く。
 */
function drawWin() {
  push();
  fill(120, 255, 160);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("完全クリア!", WIDTH / 2, HEIGHT / 2 - 30);
  fill(255);
  textSize(18);
  text("Space で再挑戦 / Esc でメニュー", WIDTH / 2, HEIGHT / 2 + 20);
  pop();
}

/**
 * デバッグ情報を描画する。
 */
function drawDebugInfo() {
  push();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  text(
    `ボール数: ${balls.length}\nパワーアップ: ${powerups.length}\n減速倍率: ${slowMultiplier.toFixed(2)}\nスティッキー: ${isStickyActive() ? "有効" : "無効"}`,
    16,
    HEIGHT - 80
  );
  pop();
}

/**
 * スティッキー効果の有効状態を返す。
 * @returns {boolean} 有効か
 */
function isStickyActive() {
  return effectPools.sticky > 0;
}

/**
 * スペース押下やクリックで発射する。
 */
function releaseStuckBalls() {
  let released = false;
  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    if (!ball.stuck) {
      continue;
    }
    const offset = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
    ball.release(computeLaunchAngle(offset));
    released = true;
  }
  if (released && scene === "pause") {
    scene = "play";
  }
}

function keyPressed() {
  if (key === "ArrowLeft" || key === "a" || key === "A") {
    inputState.left = true;
  } else if (key === "ArrowRight" || key === "d" || key === "D") {
    inputState.right = true;
  }

  if (key === " " || key === "Spacebar") {
    if (scene === "menu" || scene === "over" || scene === "win") {
      startGame();
    } else if (scene === "pause") {
      scene = "play";
    } else {
      releaseStuckBalls();
    }
  }

  if (key === "p" || key === "P") {
    if (scene === "play") {
      scene = "pause";
    } else if (scene === "pause") {
      scene = "play";
    }
  }

  if (key === "r" || key === "R") {
    initGame();
    startGame();
  }

  if (key === "Escape") {
    initGame();
  }

  if (key === "t" || key === "T") {
    debugDraw = !debugDraw;
  }
}

function keyReleased() {
  if (key === "ArrowLeft" || key === "a" || key === "A") {
    inputState.left = false;
  } else if (key === "ArrowRight" || key === "d" || key === "D") {
    inputState.right = false;
  }
}

function mouseMoved() {
  pointerState.active = true;
  pointerState.x = clamp(mouseX, 0, WIDTH);
}

function mouseDragged() {
  mouseMoved();
}

function mousePressed() {
  if (scene === "menu" || scene === "over" || scene === "win") {
    startGame();
  } else if (scene === "pause") {
    scene = "play";
  } else {
    releaseStuckBalls();
  }
}

function touchStarted() {
  if (touches && touches.length > 0) {
    pointerState.active = true;
    pointerState.x = clamp(touches[0].x, 0, WIDTH);
  }
  mousePressed();
  return false;
}

function touchMoved() {
  if (touches && touches.length > 0) {
    pointerState.active = true;
    pointerState.x = clamp(touches[0].x, 0, WIDTH);
  }
  return false;
}

function touchEnded() {
  return false;
}
