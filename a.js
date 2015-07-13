var canvas = document.getElementById("canvas");

var SPACE = 0;
var WALL = 1;
var SPIKE = 2;
var EXIT = 3;

var cardinalDirections = [
  {r: 1, c: 0, forwards:"v", backwards:"^"},
  {r:-1, c: 0, forwards:"^", backwards:"v"},
  {r: 0, c: 1, forwards:">", backwards:"<"},
  {r: 0, c:-1, forwards:"<", backwards:">"},
];

var level1 = {
  map: [
    "                    ",
    "                    ",
    "         @          ",
    "                    ",
    "                    ",
    "      AA    BB      ",
    "      A$    $B      ",
    "         %          ",
    "         %          ",
    "         %          ",
  ],
  objects: {
    "A": {
      type: "snake",
      shape: [
        ">@",
        "^ ",
      ],
    },
    "B": {
      type: "snake",
      shape: [
        "@<",
        " ^",
      ],
    },
  },
};
var tileSize = 30;
var level;
var undoBuffer = [];
loadLevel(level1);
function loadLevel(serialLevel) {
  var result = {
    map: [],
    objects: [],
    width: null,
    height: null,
    snakeCount: 0,
  };
  validateSerialRectangle(result, serialLevel.map);
  var objectsByKey = {};
  serialLevel.map.forEach(function(row, r) {
    row.split("").forEach(function(tileCode, c) {
      if (tileCode === " ") {
        result.map.push(SPACE);
      } else if (tileCode === "%") {
        result.map.push(WALL);
      } else if (tileCode === "#") {
        result.map.push(SPIKE);
      } else if (tileCode === "@") {
        result.map.push(EXIT);
      } else if (tileCode === "$") {
        result.map.push(SPACE);
        result.objects.push(newFruit(r, c));
      } else if (/[A-Za-z]/.test(tileCode)) {
        result.map.push(SPACE);
        var object = objectsByKey[tileCode];
        if (object == null) {
          objectsByKey[tileCode] = object = newObject(r, c, serialLevel.objects[tileCode]);
          result.objects.push(object);
        } else {
          // TODO: check the shape
        }
      } else {
        throw asdf;
      }
    });
  });

  level = result;
  canvas.width = tileSize * level.width;
  canvas.height = tileSize * level.height;

  function newFruit(r, c) {
    return {
      type: "fruit",
      locations: [getLocation(result, r, c)],
    };
  }
  function newObject(r, c, serialObjectSpec) {
    // TODO: align c backwards for shapes that have space in the upper-left corner
    var type;
    var snakeIndex = null;
    if (serialObjectSpec.type === "snake") {
      type = "snake";
      snakeIndex = result.snakeCount;
      result.snakeCount += 1;
    } else {
      throw asdf;
    }
    var shapeProperties = {width: null, height: null};
    validateSerialRectangle(shapeProperties, serialObjectSpec.shape);
    var localLocations = [];
    var node = findHead();
    localLocations.push(node);
    while (true) {
      if (localLocations.length >= shapeProperties.height * shapeProperties.width) throw asdf;
      node = findNextSegment(node);
      if (node == null) break;
      localLocations.push(node);
    }
    var locations = localLocations.map(function(node) {
      return getLocation(result, r + node.r, c + node.c);
    });
    return {
      type: type,
      locations: locations,
      snakeIndex: snakeIndex,
    };

    function findHead() {
      for (var r = 0; r < serialObjectSpec.shape.length; r++) {
        var row = serialObjectSpec.shape[r];
        for (var c = 0; c < row.length; c++) {
          if (row[c] === "@") return {r:r, c:c};
        }
      }
      throw asdf;
    }
    function findNextSegment(fromNode) {
      for (var i = 0; i < cardinalDirections.length; i++) {
        var node = {r:cardinalDirections[i].r + fromNode.r, c:cardinalDirections[i].c + fromNode.c};
        if (node.c < 0 || node.c >= shapeProperties.width) continue;
        if (node.r < 0 || node.r >= shapeProperties.height) continue;
        var shapeCode = serialObjectSpec.shape[node.r][node.c];
        if (shapeCode === cardinalDirections[i].backwards) return node;
      }
      return null;
    }
  }
}

function saveState() {
  undoBuffer.push(JSON.stringify(level.objects));
}
function undo() {
  if (undoBuffer.length === 0) return;
  level.objects = JSON.parse(undoBuffer.pop());
  render();
}

function validateSerialRectangle(outProperties, table) {
  outProperties.height = table.length;
  table.forEach(function(row) {
    if (outProperties.width === null) {
      outProperties.width = row.length;
    } else {
      if (outProperties.width !== row.length) throw asdf;
    }
  });
}

function getLocation(level, r, c) {
  if (c < 0 || c >= level.width) throw asdf;
  if (r < 0 || r >= level.height) throw asdf;
  return r * level.width + c;
}
function getRowcol(level, location) {
  if (location < 0 || location >= level.width * level.height) throw asdf;
  var r = Math.floor(location / level.width);
  var c = location % level.width;
  return {r:r, c:c};
}

document.addEventListener("keydown", function(event) {
  if (event.shiftKey || event.ctrlKey || event.altKey) return;
  if (event.keyCode > 90) return;
  event.preventDefault();
  switch (event.keyCode) {
    case 37: // left
      move(0, -1);
      break;
    case 38: // up
      move(-1, 0);
      break;
    case 39: // right
      move(0, 1);
      break;
    case 40: // down
      move(1, 0);
      break;
    case 8:  // backspace
      undo();
      break;
    case 32: // space
    case 9:  // tab
      activeSnake = (activeSnake + 1) % level.snakeCount;
      break;
  }
  render();
});

function move(dr, dc) {
  var snake = findActiveSnake();
  var headRowcol = getRowcol(level, snake.locations[0]);
  var newRowcol = {r:headRowcol.r + dr, c:headRowcol.c + dc};

  // do it
  saveState();
  snake.locations.unshift(getLocation(level, newRowcol.r, newRowcol.c));
  snake.locations.pop();
  render();
}

function findActiveSnake() {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.type === "snake" && object.snakeIndex === activeSnake) return object;
  }
  throw asdf;
}

var snakeColors = [
  "#f00",
  "#0f0",
];

var activeSnake = 0;

function render() {
  var context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (var r = 0; r < level.height; r++) {
    for (var c = 0; c < level.width; c++) {
      var tileCode = level.map[getLocation(level, r, c)];
      switch (tileCode) {
        case SPACE:
          break;
        case WALL:
          drawRect(r, c, "#fff");
          break;
        case EXIT:
          drawQuarterPie(r, c, "#f00", 0);
          drawQuarterPie(r, c, "#0f0", 1);
          drawQuarterPie(r, c, "#00f", 2);
          drawQuarterPie(r, c, "#ff0", 3);
          break;
        default: //throw asdf;
      }
    }
  }

  level.objects.forEach(function(object) {
    switch (object.type) {
      case "snake":
        var lastRowcol = null
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          if (lastRowcol == null) {
            // head
            if (activeSnake === object.snakeIndex) {
              drawRect(rowcol.r, rowcol.c, "#888");
            }
            drawDiamond(rowcol.r, rowcol.c, snakeColors[object.snakeIndex]);
          } else {
            // tail segment
            var color = snakeColors[object.snakeIndex];
            drawTriangle(rowcol.r, rowcol.c, color, getDirectionFromDifference(lastRowcol, rowcol));
          }
          lastRowcol = rowcol;
        });
        break;
      case "fruit":
        var rowcol = getRowcol(level, object.locations[0]);
        drawCircle(rowcol.r, rowcol.c, "#f0f");
        break;
      default: throw asdf;
    }
  });

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
  function drawCircle(r, c, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc((c + 0.5) * tileSize, (r + 0.5) * tileSize, tileSize/2, 0, 2*Math.PI);
    context.fill();
  }
  function drawRect(r, c, fillStyle) {
    context.fillStyle = fillStyle;
    context.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
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

function getDirectionFromDifference(toRowcol, fromRowcol) {
  var dr = toRowcol.r - fromRowcol.r;
  var dc = toRowcol.c - fromRowcol.c;
  if      (dr ===  0 && dc ===  1) return ">";
  else if (dr ===  0 && dc === -1) return "<";
  else if (dr ===  1 && dc ===  0) return "v";
  else if (dr === -1 && dc ===  0) return "^";
  else throw asdf;
}

render();
