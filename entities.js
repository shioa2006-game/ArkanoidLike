/**
 * パドルを表すクラス。
 */
class Paddle {
  /**
   * @param {number} x 中心X座標
   * @param {number} y 中心Y座標
   * @param {number} w 幅
   * @param {number} h 高さ
   * @param {number} maxWidth 描画領域幅
   */
  constructor(x, y, w, h, maxWidth) {
    this.x = x;
    this.y = y;
    this.baseWidth = w;
    this.w = w;
    this.h = h;
    this.maxWidth = maxWidth;
    this.speed = 480;
    this.scale = 1;
  }

  /**
   * パドルの幅係数を設定する。
   * @param {number} scale 係数
   */
  setScale(scale) {
    this.scale = clamp(scale, 0.5, 2);
    this.w = this.baseWidth * this.scale;
    this.clamp();
  }

  /**
   * 目標X座標に基づいて位置を更新する。
   * @param {number} targetX 更新後のX座標
   */
  update(targetX) {
    this.x = targetX;
    this.clamp();
  }

  /**
   * 画面外に出ないよう位置を制限する。
   */
  clamp() {
    const half = this.w / 2;
    this.x = clamp(this.x, half, this.maxWidth - half);
  }

  /**
   * パドルを描画する。
   */
  draw() {
    push();
    fill(120, 200, 255);
    noStroke();
    rect(this.x, this.y, this.w, this.h, 8);
    pop();
  }
}

/**
 * ボールを表すクラス。
 */
class Ball {
  /**
   * @param {number} x 中心X座標
   * @param {number} y 中心Y座標
   * @param {number} radius 半径
   */
  constructor(x, y, radius = 6) {
    this.x = x;
    this.y = y;
    this.r = radius;
    this.speed = 300;
    this.vx = 0;
    this.vy = -this.speed;
    this.stuck = true;
  }

  /**
   * 現在のパドル位置に合わせて静止させる。
   * @param {Paddle} paddle パドル
   */
  launchFrom(paddle) {
    this.x = paddle.x;
    this.y = paddle.y - paddle.h / 2 - this.r - 2;
    this.vx = 0;
    this.vy = -this.speed;
    this.stuck = true;
  }

  /**
   * 角度を指定して発射させる。
   * @param {number} angleRad 発射角（ラジアン）
   */
  release(angleRad) {
    this.setAngle(angleRad);
    this.stuck = false;
  }

  /**
   * 現在角度を設定する。
   * @param {number} angleRad ラジアン角
   */
  setAngle(angleRad) {
    this.vx = Math.cos(angleRad) * this.speed;
    this.vy = Math.sin(angleRad) * this.speed;
  }

  /**
   * 毎フレームの移動を計算する。
   * @param {number} dt 経過時間（秒）
   * @param {number} speedScale 速度倍率
   */
  update(dt, speedScale = 1) {
    if (this.stuck) {
      return;
    }
    this.x += this.vx * speedScale * dt;
    this.y += this.vy * speedScale * dt;
  }

  /**
   * 法線で反射させる。
   * @param {number} nx 法線X
   * @param {number} ny 法線Y
   */
  reflect(nx, ny) {
    const next = reflect(this.vx, this.vy, nx, ny);
    const length = Math.hypot(next.vx, next.vy) || 1;
    this.vx = (next.vx / length) * this.speed;
    this.vy = (next.vy / length) * this.speed;
  }

  /**
   * ボールを描画する。
   * @param {boolean} debug デバッグ表示フラグ
   */
  draw(debug = false) {
    push();
    noStroke();
    fill(255, 220, 120);
    circle(this.x, this.y, this.r * 2);
    if (debug && !this.stuck) {
      stroke(255, 80, 80);
      line(this.x, this.y, this.x + this.vx * 0.1, this.y + this.vy * 0.1);
    }
    pop();
  }
}

/**
 * ブロックを表すクラス。
 */
class Brick {
  /**
   * @param {number} x 中心X座標
   * @param {number} y 中心Y座標
   * @param {number} w 幅
   * @param {number} h 高さ
   * @param {string} type 種類
   * @param {number} gridX グリッドX
   * @param {number} gridY グリッドY
   */
  constructor(x, y, w, h, type, gridX, gridY) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    this.alive = true;
    this.hp = this.determineHp(type);
    this.maxHp = this.hp;
  }

  /**
   * 種類に応じた耐久値を返す。
   * @param {string} type 種類
   * @returns {number} 耐久値
   */
  determineHp(type) {
    switch (type) {
      case "D":
        return 2;
      case "U":
        return Infinity;
      default:
        return 1;
    }
  }

  /**
   * 被弾処理を行う。
   * @param {boolean} fromExplosion 爆発ダメージかどうか
   * @returns {{destroyed:boolean, score:number, triggerExplosion:boolean}} 処理結果
   */
  hit(fromExplosion = false) {
    if (!this.alive) {
      return { destroyed: false, score: 0, triggerExplosion: false };
    }
    if (this.type === "U") {
      return { destroyed: false, score: 0, triggerExplosion: false };
    }

    this.hp -= 1;

    if (this.hp <= 0) {
      this.alive = false;
      const triggerExplosion = this.type === "E" && !fromExplosion;
      let gained = 0;
      if (this.type === "N") {
        gained = 50;
      } else if (this.type === "D") {
        gained = 100;
      } else if (this.type === "E") {
        gained = 150;
      }
      return { destroyed: true, score: gained, triggerExplosion };
    }

    return { destroyed: false, score: 0, triggerExplosion: false };
  }

  /**
   * 現在の見た目に合わせて描画する。
   * @param {boolean} debug デバッグ表示フラグ
   */
  draw(debug = false) {
    if (!this.alive) {
      return;
    }

    push();
    noStroke();

    let fillColor = color(120, 200, 255);
    switch (this.type) {
      case "N":
        fillColor = color(80, 180, 255);
        break;
      case "D":
        if (this.hp === 2) {
          fillColor = color(255, 160, 90);
        } else {
          fillColor = color(255, 210, 120);
        }
        break;
      case "U":
        fillColor = color(90, 90, 110);
        break;
      case "E":
        fillColor = color(255, 90, 120);
        break;
    }

    fill(fillColor);
    rect(this.x, this.y, this.w, this.h, 6);

    if (this.type === "U") {
      stroke(180, 180, 220);
      noFill();
      rect(this.x, this.y, this.w - 6, this.h - 6, 4);
    }

    if (debug) {
      stroke(0, 255, 0, 120);
      noFill();
      rect(this.x, this.y, this.w, this.h);
    }

    pop();
  }
}

/**
 * パワーアップを表すクラス。
 */
class Powerup {
  /**
   * @param {number} x 中心X座標
   * @param {number} y 中心Y座標
   * @param {string} type パワーアップ種別
   */
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.w = 18;
    this.h = 10;
    this.vy = 150;
    this.active = true;
  }

  /**
   * 落下処理を行う。
   * @param {number} dt 経過時間（秒）
   */
  update(dt) {
    if (!this.active) {
      return;
    }
    this.y += this.vy * dt;
  }

  /**
   * パワーアップを描画する。
   */
  draw() {
    if (!this.active) {
      return;
    }

    push();
    rectMode(CENTER);
    stroke(0);
    strokeWeight(1);

    let fillColor = color(200, 255, 120);
    switch (this.type) {
      case "EXPAND":
        fillColor = color(120, 220, 255);
        break;
      case "SHRINK":
        fillColor = color(220, 120, 255);
        break;
      case "SLOW":
        fillColor = color(120, 255, 180);
        break;
      case "MULTI":
        fillColor = color(255, 180, 80);
        break;
      case "STICKY":
        fillColor = color(255, 120, 160);
        break;
    }
    fill(fillColor);
    rect(this.x, this.y, this.w, this.h, 4);

    noStroke();
    fill(30);
    textAlign(CENTER, CENTER);
    textSize(10);
    const labels = {
      EXPAND: "広",
      SHRINK: "狭",
      SLOW: "遅",
      MULTI: "球",
      STICKY: "粘"
    };
    text(labels[this.type] || "？", this.x, this.y + 1);

    pop();
  }
}
