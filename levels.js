/**
 * ステージ構成の定義。
 * rows/cols はマップ行列数、offset は左上の中心座標、cell はブロック間隔を表す。
 * @type {Array<{name:string, rows:number, cols:number, offsetX:number, offsetY:number, cellW:number, cellH:number, map:string[]}>}
 */
const LEVELS = [
  {
    name: "ステージ 1",
    rows: 6,
    cols: 12,
    offsetX: 80,
    offsetY: 80,
    cellW: 60,
    cellH: 26,
    map: [
      "NNNNNNNNNNNN",
      "N DDDDDDDDN ",
      "N  NNNN  N N",
      "N  EEEE  E N",
      "N UU    UU N",
      "NNNNNNNNNNNN"
    ]
  },
  {
    name: "ステージ 2",
    rows: 7,
    cols: 12,
    offsetX: 80,
    offsetY: 72,
    cellW: 60,
    cellH: 26,
    map: [
      "  UUUUUUUU  ",
      " NNNNNNNNNN ",
      "N EEEE EEEN ",
      "N DDDUUUDDN ",
      "N   EEEE   N",
      "N DDDUUUDDN ",
      "N EEEE EEEN "
    ]
  },
  {
    name: "ステージ 3",
    rows: 8,
    cols: 12,
    offsetX: 80,
    offsetY: 68,
    cellW: 60,
    cellH: 26,
    map: [
      " EEEE  EEEE ",
      "N NNNNNN N N",
      "N UUUUUUUU N",
      "N NNDDDNN N ",
      "N N  E  N N ",
      "N NNDUDNN N ",
      "N N  E  N N ",
      " NNNNNNNNNN "
    ]
  }
];
