/**
 * 指定された値を最小値と最大値の範囲に収める。
 * @param {number} value 収めたい値
 * @param {number} min 最小値
 * @param {number} max 最大値
 * @returns {number} 範囲内に収めた値
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 指定範囲の乱数を返す。
 * @param {number} min 最小値
 * @param {number} max 最大値
 * @returns {number} 範囲内の乱数
 */
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * 円と中心座標ベースの矩形との衝突情報を返す。
 * @param {number} cx 円のX座標
 * @param {number} cy 円のY座標
 * @param {number} r 円の半径
 * @param {number} rx 矩形中心のX座標
 * @param {number} ry 矩形中心のY座標
 * @param {number} rw 矩形の幅
 * @param {number} rh 矩形の高さ
 * @returns {{hit:boolean, nx:number, ny:number}} 衝突の有無と法線
 */
function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const halfW = rw / 2;
  const halfH = rh / 2;
  const closestX = clamp(cx, rx - halfW, rx + halfW);
  const closestY = clamp(cy, ry - halfH, ry + halfH);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > r * r) {
    return { hit: false, nx: 0, ny: 0 };
  }

  const deltaX = cx - rx;
  const deltaY = cy - ry;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  let nx = 0;
  let ny = 0;

  if (absX > absY) {
    nx = deltaX > 0 ? 1 : -1;
  } else if (absY > absX) {
    ny = deltaY > 0 ? 1 : -1;
  } else {
    const length = Math.hypot(deltaX, deltaY) || 1;
    nx = deltaX / length;
    ny = deltaY / length;
  }

  return { hit: true, nx, ny };
}

/**
 * ベクトルを指定法線で反射させる。
 * @param {number} vx 反射前のX成分
 * @param {number} vy 反射前のY成分
 * @param {number} nx 法線ベクトルX成分
 * @param {number} ny 法線ベクトルY成分
 * @returns {{vx:number, vy:number}} 反射後のベクトル
 */
function reflect(vx, vy, nx, ny) {
  const normalLen = Math.hypot(nx, ny) || 1;
  const unitX = nx / normalLen;
  const unitY = ny / normalLen;
  const dot = vx * unitX + vy * unitY;
  return {
    vx: vx - 2 * dot * unitX,
    vy: vy - 2 * dot * unitY
  };
}

/**
 * 角度を指定範囲に収める。
 * @param {number} rad ラジアン角
 * @param {number} minDeg 最小角度（度数法）
 * @param {number} maxDeg 最大角度（度数法）
 * @returns {number} 範囲内のラジアン角
 */
function clampAngle(rad, minDeg = 20, maxDeg = 160) {
  let deg = degrees(rad);
  deg = ((deg % 360) + 360) % 360;

  if (deg <= 180) {
    deg = clamp(deg, minDeg, maxDeg);
  } else {
    deg = clamp(deg, 180 + minDeg, 180 + maxDeg);
  }

  return radians(deg);
}

/**
 * 中心座標ベースの矩形同士が重なっているか調べる。
 * @param {number} ax A矩形の中心X
 * @param {number} ay A矩形の中心Y
 * @param {number} aw A矩形の幅
 * @param {number} ah A矩形の高さ
 * @param {number} bx B矩形の中心X
 * @param {number} by B矩形の中心Y
 * @param {number} bw B矩形の幅
 * @param {number} bh B矩形の高さ
 * @returns {boolean} 重なりの有無
 */
function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    Math.abs(ax - bx) * 2 < aw + bw &&
    Math.abs(ay - by) * 2 < ah + bh
  );
}
