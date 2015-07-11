var canvas = document.getElementById("canvas");

var level = [
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "                         ",
  "           @             ",
  "                         ",
  "                         ",
  "        >1    2<         ",
  "        ^$    $^         ",
  "           O             ",
  "           O             ",
  "           O             ",
  "           O             ",
  "           O             ",
  "           O             ",
];
var levelWidth = 25;
var levelHeight = 20;
var tileSize = 30;
(function() {
  if (level.length !== levelHeight) throw asdf;
  level.forEach(function(row) {
    if (row.length !== levelWidth) throw asdf;
  });
})();

document.addEventListener("keydown", function(event) {
  console.log(event);
});

var snakeToColor = {
  "1": "#f00",
  "2": "#0f0",
  "3": "#00f",
};

function render() {
  var context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (var r = 0; r < levelHeight; r++) {
    for (var c = 0; c < levelWidth; c++) {
      var tileCode = level[r][c];
      switch (tileCode) {
        case " ":
          break;
        case "1": case "2":
          drawDiamond(r, c, snakeToColor[tileCode]);
          break;
        case "^": case ">": case "v": case "<":
          var color = snakeToColor[findHeadSnake(r, c)];
          drawTriangle(r, c, color, tileCode);
          break;
        case "$":
          context.fillStyle = "#f0f";
          context.beginPath();
          context.arc((c + 0.5) * tileSize, (r + 0.5) * tileSize, tileSize/2, 0, 2*Math.PI);
          context.fill();
          break;
        case "O":
          context.fillStyle = "#fff";
          context.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
          break;
        case "@":
          drawQuarterPie(r, c, "#f00", 0);
          drawQuarterPie(r, c, "#0f0", 1);
          drawQuarterPie(r, c, "#00f", 2);
          drawQuarterPie(r, c, "#ff0", 3);
          break;
        default: //throw asdf;
      }
    }
  }

  function drawQuarterPie(r, c, fillStyle, quadrant) {
    var cx = (c + 0.5) * tileSize;
    var cy = (r + 0.5) * tileSize;
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, tileSize/2, quadrant * Math.PI/2, (quadrant + 1) * Math.PI/2);
    context.fill();
  }
  function drawDiamond(r, c, fillStyle) {
    var x = c * tileSize;
    var y = r * tileSize;
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(x + tileSize/2, y);
    context.lineTo(x + tileSize, y + tileSize/2);
    context.lineTo(x + tileSize/2, y + tileSize);
    context.lineTo(x, y + tileSize/2);
    context.lineTo(x + tileSize/2, y);
    context.fill();
  }
  function drawTriangle(r, c, fillStyle, tileCode) {
    var x = c * tileSize;
    var y = r * tileSize;
    var points;
    switch (tileCode) {
      case "^":
        points = [
          [x + tileSize/2, y],
          [x + tileSize, y + tileSize],
          [x, y + tileSize],
        ];
        break;
      case "v":
        points = [
          [x + tileSize/2, y + tileSize],
          [x + tileSize, y],
          [x, y],
        ];
        break;
      case ">":
        points = [
          [x, y],
          [x + tileSize, y + tileSize/2],
          [x, y + tileSize],
        ];
        break;
      case "<":
        points = [
          [x + tileSize, y],
          [x, y + tileSize/2],
          [x + tileSize, y + tileSize],
        ];
        break;
      default: throw asdf;
    }

    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    context.lineTo(points[1][0], points[1][1]);
    context.lineTo(points[2][0], points[2][1]);
    context.lineTo(points[0][0], points[0][1]);
    context.fill();
  }
}

function findHeadSnake(r, c) {
  while (true) {
    var tileCode = level[r][c];
    switch (tileCode) {
      case "1": case "2":
        return tileCode;
      case "^":
        r--;
        continue;
      case "v":
        r++;
        continue;
      case "<":
        c--;
        continue;
      case ">":
        c++;
        continue;
    }
    throw asdf;
  }
}

render();
