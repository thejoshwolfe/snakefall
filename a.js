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
var unmoveBuffer = [];
loadLevel(level1);
function loadLevel(serialLevel) {
  var result = {
    map: [],
    objects: [],
    width: null,
    height: null,
  };
  validateSerialRectangle(result, serialLevel.map);
  var objectsByKey = {};
  var snakeCount = 0;
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
  pushUnmoveFrame();
  return;

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
      snakeIndex = snakeCount;
      snakeCount++;
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
      snakeColor: snakeIndex,
      dead: false, // only used for displaying dead snakes to let the user undo
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

function pushUnmoveFrame() {
  if (unmoveBuffer.length !== 0) {
    // don't duplicate states
    if (deepEquals(JSON.parse(unmoveBuffer[unmoveBuffer.length - 1]), level.objects)) return;
  }
  unmoveBuffer.push(JSON.stringify(level.objects));
}
function unmove() {
  if (unmoveBuffer.length <= 1) return; // already at the beginning
  unmoveBuffer.pop(); // that was the current state
  level.objects = JSON.parse(unmoveBuffer[unmoveBuffer.length - 1]);
  render();
}
function reset() {
  unmoveBuffer.splice(1);
  level.objects = JSON.parse(unmoveBuffer[0]);
}

function deepEquals(a, b) {
  if (a == null) return b == null;
  if (typeof a === "string" || typeof a === "number") return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }
  // must be objects
  var aKeys = Object.keys(a);
  var bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  aKeys.sort();
  bKeys.sort();
  if (!deepEquals(aKeys, bKeys)) return false;
  for (var i = 0; i < aKeys.length; i++) {
    if (!deepEquals(a[aKeys[i]], b[bKeys[i]])) return false;
  }
  return true;
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
  if (!isInBounds(level, r, c)) throw asdf;
  return r * level.width + c;
}
function getRowcol(level, location) {
  if (location < 0 || location >= level.width * level.height) throw asdf;
  var r = Math.floor(location / level.width);
  var c = location % level.width;
  return {r:r, c:c};
}
function isInBounds(level, r, c) {
  if (c < 0 || c >= level.width) return false;;
  if (r < 0 || r >= level.height) return false;;
  return true;
}
function offsetLocation(location, dr, dc) {
  var rowcol = getRowcol(level, location);
  return getLocation(level, rowcol.r + dr, rowcol.c + dc);
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
    case 90: // z
      unmove();
      break;
    case 82: // r
      reset();
      break;
    case 32: // spacebar
    case 9:  // tab
      if (isAlive()) {
        activeSnake = (activeSnake + 1) % countSnakes();
      }
      break;
  }
  render();
});

function move(dr, dc) {
  if (!isAlive()) return;
  var snake = findActiveSnake();
  var headRowcol = getRowcol(level, snake.locations[0]);
  var newRowcol = {r:headRowcol.r + dr, c:headRowcol.c + dc};
  if (!isInBounds(level, newRowcol.r, newRowcol.c)) return;
  var newLocation = getLocation(level, newRowcol.r, newRowcol.c);

  var ate = false;
  var pushedObjects = [];

  var newTile = level.map[newLocation];
  if (!isTileCodeAir(newTile)) return;
  var otherObject = findObjectAtLocation(newLocation);
  if (otherObject != null) {
    if (otherObject === snake) return; // can't push yourself
    if (otherObject.type === "fruit") {
      // eat
      removeObject(otherObject);
      ate = true;
    } else {
      // push objects
      if (!pushOrFallOrSomething(snake, otherObject, dr, dc, pushedObjects)) return false;
    }
  }

  // move to empty space
  snake.locations.unshift(newLocation);
  if (!ate) {
    snake.locations.pop();
  }
  // push everything, too
  moveObjects(pushedObjects, dr, dc);

  // gravity loop
  while (true) {
    var didAnything = false;

    // check for exit
    if (countFruit() === 0) {
      var snakes = getSnakes();
      for (var i = 0; i < snakes.length; i++) {
        if (level.map[snakes[i].locations[0]] === EXIT) {
          // (one of) you made it!
          removeObject(snakes[i]);
          didAnything = true;
        }
      }
      // reindex snakes
      var snakeCount = 0;
      for (var i = 0; i < level.objects.length; i++) {
        var object = level.objects[i];
        if (object.type === "snake") {
          object.snakeIndex = snakeCount;
          snakeCount++;
        }
      }
      if (activeSnake >= snakeCount) {
        activeSnake = 0;
      }
    }

    // fall
    var dyingObjects = [];
    var fallingObjects = level.objects.filter(function(object) {
      if (object.type === "fruit") return false;
      if (pushOrFallOrSomething(null, object, 1, 0, [], dyingObjects)) {
        // this object can fall. maybe more will fall with it too. we'll check those separately.
        return true;
      }
    });
    if (dyingObjects.length > 0) {
      dyingObjects.forEach(function(object) {
        if (object.type === "snake") {
          // look what you've done
          object.dead = true;
        } else {
          // a box fell off the world
          removeObject(object);
        }
      });
      break;
    }
    if (fallingObjects.length > 0) {
      moveObjects(fallingObjects, 1, 0);
      didAnything = true;
    }

    if (!didAnything) break;
    // for debugging
    render();
  }

  pushUnmoveFrame();
  render();
}

function pushOrFallOrSomething(pusher, pushedObject, dr, dc, pushedObjects, dyingObjects) {
  // pusher can be null (for gravity)
  pushedObjects.push(pushedObject);
  // find forward locations
  var forwardLocations = [];
  for (var i = 0; i < pushedObjects.length; i++) {
    pushedObject = pushedObjects[i];
    for (var j = 0; j < pushedObject.locations.length; j++) {
      var rowcol = getRowcol(level, pushedObject.locations[j]);
      var forwardRowcol = {r:rowcol.r + dr, c:rowcol.c + dc};
      if (!isInBounds(level, forwardRowcol.r, forwardRowcol.c)) {
        if (dyingObjects == null) {
          // can't push things out of bounds
          return false;
        } else {
          // this thing is going to fall out of bounds
          addIfNotPresent(dyingObjects, pushedObject);
          addIfNotPresent(pushedObjects, pushedObject);
          continue;
        }
      }
      var forwardLocation = getLocation(level, forwardRowcol.r, forwardRowcol.c);
      var yetAnotherObject = findObjectAtLocation(forwardLocation);
      if (yetAnotherObject != null) {
        if (yetAnotherObject === pusher) {
          // indirect pushing ourselves.
          // special check for when we're indirectly pushing the tip of our own tail.
          if (forwardLocation === pusher.locations[pusher.locations.length -1]) {
            // for some reason this is ok.
            continue;
          }
          return false;
        }
        if (yetAnotherObject.type === "fruit") {
          // can't indirectly push fruit
          return false;
        }
        addIfNotPresent(pushedObjects, yetAnotherObject);
      } else {
        addIfNotPresent(forwardLocations, forwardLocation);
      }
    }
  }
  // check forward locations
  for (var i = 0; i < forwardLocations.length; i++) {
    var forwardLocation = forwardLocations[i];
    // many of these locations can be inside objects,
    // but that means the tile must be air,
    // and we already know pushing that object.
    var tileCode = level.map[forwardLocation];
    if (!isTileCodeAir(tileCode)) {
      if (dyingObjects != null) {
        if (tileCode === SPIKE) {
          // ouch!
          // uh... which object was this again?
          var deadObject = findObjectAtLocation(offsetLocation(forwardLocation, -dr, -dc));
          addIfNotPresent(dyingObjects, deadObject);
        }
      }
      // can't push into something solid
      return false;
    }
  }
  // the push is go
  return true;
}

function moveObjects(objects, dr, dc) {
  objects.forEach(function(object) {
    for (var i = 0; i < object.locations.length; i++) {
      object.locations[i] = offsetLocation(object.locations[i], dr, dc);
    }
  });
}

function isTileCodeAir(tileCode) {
  return tileCode === SPACE || tileCode === EXIT;
}

function addIfNotPresent(array, element) {
  if (array.indexOf(element) !== -1) return;
  array.push(element);
}
function removeObject(object) {
  removeFromArray(level.objects, object);
}
function removeFromArray(array, element) {
  var index = array.indexOf(element);
  if (index === -1) throw asdf;
  array.splice(index, 1);
}
function findActiveSnake() {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.type === "snake" && object.snakeIndex === activeSnake) return object;
  }
  throw asdf;
}
function findObjectAtLocation(location) {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.locations.indexOf(location) !== -1)
      return object;
  }
  return null;
}
function countFruit() {
  return getObjectsOfType("fruit").length;
}
function countSnakes() {
  return getSnakes().length;
}
function getSnakes() {
  return getObjectsOfType("snake");
}
function getObjectsOfType(type) {
  return level.objects.filter(function(object) {
    return object.type == type;
  });
}
function isDead() {
  return getSnakes().filter(function(snake) {
    return !!snake.dead;
  }).length > 0;
}
function isAlive() {
  return countSnakes() > 0 && !isDead();
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
          var radiusFactor = countFruit() === 0 ? 1.2 : 0.7;
          drawQuarterPie(r, c, radiusFactor, "#f00", 0);
          drawQuarterPie(r, c, radiusFactor, "#0f0", 1);
          drawQuarterPie(r, c, radiusFactor, "#00f", 2);
          drawQuarterPie(r, c, radiusFactor, "#ff0", 3);
          break;
        default: throw asdf;
      }
    }
  }

  level.objects.forEach(function(object) {
    switch (object.type) {
      case "snake":
        var lastRowcol = null
        var color = snakeColors[object.snakeColor];
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          if (object.dead) rowcol.r += 0.5;
          if (lastRowcol == null) {
            // head
            if (activeSnake === object.snakeIndex) {
              drawRect(rowcol.r, rowcol.c, "#888");
            }
            drawDiamond(rowcol.r, rowcol.c, color);
          } else {
            // tail segment
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

  if (countSnakes() === 0) {
    // you win banner
    context.fillStyle = "#ff0";
    context.font = "100px Arial";
    context.fillText("You Win!", 0, canvas.height / 2);
  }
  if (isDead()) {
    context.fillStyle = "#f00";
    context.font = "100px Arial";
    context.fillText("You Dead!", 0, canvas.height / 2);
  }

  function drawQuarterPie(r, c, radiusFactor, fillStyle, quadrant) {
    var cx = (c + 0.5) * tileSize;
    var cy = (r + 0.5) * tileSize;
    context.fillStyle = fillStyle;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, radiusFactor * tileSize/2, quadrant * Math.PI/2, (quadrant + 1) * Math.PI/2);
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
  function drawTriangle(r, c, fillStyle, direction) {
    var x = c * tileSize;
    var y = r * tileSize;
    var points;
    switch (direction) {
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
