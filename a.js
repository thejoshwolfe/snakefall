var canvas = document.getElementById("canvas");

var SPACE = 0;
var WALL = 1;
var SPIKE = 2;
var EXIT = 3;

var validTileCodes = [SPACE, WALL, SPIKE, EXIT];

var level1 = {
  "height": 18,
  "width": 25,
  "map": [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,0,2,2,2,2,0,0,0,0,0,0,0,0,0,
    0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,
    0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,
    0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0
  ],
  "objects": [
    {
      "type": "snake",
      "snakeColor": 0,
      "dead": false,
      "locations": [217,218,219,244]
    },
    {
      "type": "block",
      "locations": [243,343]
    },
    {
      "type": "snake",
      "snakeColor": 1,
      "dead": false,
      "locations": [292,293,294]
    },
    {
      "type": "fruit",
      "locations": [317]
    },
    {
      "type": "snake",
      "snakeColor": 2,
      "dead": false,
      "locations": [318,319,320]
    }
  ]
};
var tileSize = 30;
var level;
var unmoveBuffer = [];
function loadLevel(newLevel) {
  level = newLevel;
  canvas.width = tileSize * level.width;
  canvas.height = tileSize * level.height;

  activateAnySnakePlease();
  unmoveBuffer = [];
  pushUnmoveFrame();
  render();
}
function validateLevel(level) {
  // pass/fail coherency. can we work with it at all?

  // map
  if (!Array.isArray(level.map)) throw new Error("level.map must be array");
  if (level.height * level.width !== level.map.length) throw new Error("height, width, and map.length do not jive");
  for (var i = 0; i < level.map.length; i++) {
    var tileCode = level.map[i];
    if (validTileCodes.indexOf(tileCode) === -1) throw new Error("invalid tilecode: " + JSON.stringify(tileCode));
  }

  // objects
  if (!Array.isArray(level.objects)) throw new Error("level.objects must be array");
  level.objects.forEach(function(object) {
    if (!Array.isArray(object.locations)) throw new Error("object.locations must be array");
    if (object.locations.length === 0) throw new Error("object.locations.length must be > 0");
    object.locations.forEach(function(location) {
      if (level.map[location] == null) throw new Error("invalid location: " + JSON.stringify(location));
    });
    switch (object.type) {
      case "fruit":
        if (object.locations.length !== 1) throw new Error("a fruit object can only have a single location");
        break;
      case "block":
        // it's all good
        break;
      case "snake":
        if (snakeColors[object.snakeColor] == null) throw new Error("invalid snakeColor: " + JSON.stringify(object.snakeColor));
        if (typeof object.dead !== "boolean") throw new Error("invalid dead: " + JSON.stringify(object.dead));
        break;
      default: throw new Error("invalid object type: " + JSON.stringify(object.type));
    }
  });

  return level;
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
        var snakes = getSnakes();
        for (var i = 0; i < snakes.length; i++) {
          if (snakes[i].snakeColor !== activeSnakeColor) continue;
          activeSnakeColor = snakes[(i + 1) % snakes.length].snakeColor;
          break;
        }
      }
      break;
  }
  render();
});
document.getElementById("showHideEditor").addEventListener("click", function() {
  persistentState.showEditor = !persistentState.showEditor;
  savePersistentState();
  showEditorChanged();
});
document.getElementById("serializationTextarea").addEventListener("keydown", function(event) {
  // let things work normally
  event.stopPropagation();
});
document.getElementById("submitSerializationButton").addEventListener("click", function() {
  var string = document.getElementById("serializationTextarea").value;
  try {
    var newLevel = validateLevel(JSON.parse(string));
  } catch (e) {
    alert(e);
    return;
  }
  loadLevel(newLevel);
});

var persistentState = {
  showEditor: false,
};
loadPersistentState();
function savePersistentState() {
  localStorage.snakefall = JSON.stringify(persistentState);
}
function loadPersistentState() {
  try {
    persistentState = JSON.parse(localStorage.snakefall);
  } catch (e) {
  }
  showEditorChanged();
}
function showEditorChanged() {
  document.getElementById("showHideEditor").value = (persistentState.showEditor ? "Hide" : "Show") + " Editor Stuff";
  document.getElementById("editorDiv").style.display = persistentState.showEditor ? "block" : "none";
}

function move(dr, dc) {
  if (!isAlive()) return;
  var activeSnake = findActiveSnake();
  var headRowcol = getRowcol(level, activeSnake.locations[0]);
  var newRowcol = {r:headRowcol.r + dr, c:headRowcol.c + dc};
  if (!isInBounds(level, newRowcol.r, newRowcol.c)) return;
  var newLocation = getLocation(level, newRowcol.r, newRowcol.c);

  var ate = false;
  var pushedObjects = [];

  var newTile = level.map[newLocation];
  if (!isTileCodeAir(newTile)) return;
  var otherObject = findObjectAtLocation(newLocation);
  if (otherObject != null) {
    if (otherObject === activeSnake) return; // can't push yourself
    if (otherObject.type === "fruit") {
      // eat
      removeObject(otherObject);
      ate = true;
    } else {
      // push objects
      if (!pushOrFallOrSomething(activeSnake, otherObject, dr, dc, pushedObjects)) return false;
    }
  }

  // move to empty space
  activeSnake.locations.unshift(newLocation);
  if (!ate) {
    activeSnake.locations.pop();
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
          if (snakes[i].snakeColor === activeSnakeColor) {
            activateAnySnakePlease();
          }
          didAnything = true;
        }
      }
    }

    // fall
    var dyingObjects = [];
    var fallingObjects = level.objects.filter(function(object) {
      if (object.type === "fruit") return false;
      var theseDyingObjects = [];
      if (!pushOrFallOrSomething(null, object, 1, 0, [], theseDyingObjects)) return false;
      // this object can fall. maybe more will fall with it too. we'll check those separately.
      theseDyingObjects.forEach(function(object) {
        addIfNotPresent(dyingObjects, object);
      });
      return true;
    });
    if (dyingObjects.length > 0) {
      var anySnakesDied = false;
      dyingObjects.forEach(function(object) {
        if (object.type === "snake") {
          // look what you've done
          object.dead = true;
          anySnakesDied = true;
        } else {
          // a box fell off the world
          removeObject(object);
          removeFromArray(fallingObjects, object);
        }
      });
      if (anySnakesDied) break;
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
          // uh... which object was this again?
          var deadObject = findObjectAtLocation(offsetLocation(forwardLocation, -dr, -dc));
          if (deadObject.type === "snake") {
            // ouch!
            addIfNotPresent(dyingObjects, deadObject);
            continue;
          }
        }
      }
      // can't push into something solid
      return false;
    }
  }
  // the push is go
  return true;
}

function activateAnySnakePlease() {
  var snakes = getSnakes();
  if (snakes.length === 0) return; // nope.avi
  activeSnakeColor = snakes[0].snakeColor;
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
  var snakes = getSnakes();
  for (var i = 0; i < snakes.length; i++) {
    if (snakes[i].snakeColor === activeSnakeColor) return snakes[i];
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
  "#00f",
  "#ff0",
];

var activeSnakeColor = null;

function render() {
  var context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // begin by rendering the background connections for blocks
  level.objects.forEach(function(object) {
    if (object.type !== "block") return;
    for (var i = 0; i < object.locations.length - 1; i++) {
      var rowcol1 = getRowcol(level, object.locations[i]);
      var rowcol2 = getRowcol(level, object.locations[i + 1]);
      var cornerRowcol = {r:rowcol1.r, c:rowcol2.c};
      drawConnector(rowcol1.r, rowcol1.c, cornerRowcol.r, cornerRowcol.c);
      drawConnector(rowcol2.r, rowcol2.c, cornerRowcol.r, cornerRowcol.c);
    }
  });

  for (var r = 0; r < level.height; r++) {
    for (var c = 0; c < level.width; c++) {
      var tileCode = level.map[getLocation(level, r, c)];
      switch (tileCode) {
        case SPACE:
          break;
        case WALL:
          drawRect(r, c, "#fff");
          break;
        case SPIKE:
          drawSpikes(r, c);
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
            if (object.snakeColor === activeSnakeColor) {
              drawRect(rowcol.r, rowcol.c, "#888");
            }
            drawDiamond(rowcol.r, rowcol.c, color);
          } else {
            // tail segment
            drawCircle(rowcol.r, rowcol.c, color);
            drawRect((rowcol.r + lastRowcol.r) / 2, (rowcol.c + lastRowcol.c) / 2, color);
          }
          lastRowcol = rowcol;
        });
        break;
      case "block":
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          drawRect(rowcol.r, rowcol.c, "#800");
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

  // serialize
  document.getElementById("serializationTextarea").value = stringifyLevel(level);

  function drawSpikes(r, c) {
    var x = c * tileSize;
    var y = r * tileSize;
    context.fillStyle = "#888";
    context.beginPath();
    context.moveTo(x, y + tileSize);
    context.lineTo(x + tileSize * 0.25, y);
    context.lineTo(x + tileSize * 0.5, y + tileSize);
    context.lineTo(x + tileSize * 0.75, y);
    context.lineTo(x + tileSize, y + tileSize);
    context.fill();
  }
  function drawConnector(r1, c1, r2, c2) {
    // either r1 and r2 or c1 and c2 must be equal
    if (r1 > r2 || c1 > c2) {
      var rTmp = r1;
      var cTmp = c1;
      r1 = r2;
      c1 = c2;
      r2 = rTmp;
      c2 = cTmp;
    }
    var xLo = (c1 + 0.4) * tileSize;
    var yLo = (r1 + 0.4) * tileSize;
    var xHi = (c2 + 0.6) * tileSize;
    var yHi = (r2 + 0.6) * tileSize;
    context.fillStyle = "#400";
    context.fillRect(xLo, yLo, xHi - xLo, yHi - yLo);
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

function stringifyLevel(level) {
  // we could just JSON.stringify, but that's kinda ugly
  var output = '';
  output +=     '{\n';
  output +=     '  "height": ' + level.height + ',\n';
  output +=     '  "width": '  + level.width  + ',\n';
  output +=     '  "map": [\n';
  for (var r = 0; r < level.height; r++) {
    output +=   '    ' + level.map.slice(r * level.width, (r + 1) * level.width).join(',');
    if (r < level.height - 1) output += ',';
    output += '\n';
  }
  output +=     '  ],\n';
  output +=     '  "objects": [\n';
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    output +=   '    {\n';
    output +=   '      "type": ' + JSON.stringify(object.type) + ',\n';
    ["snakeColor", "dead"].forEach(function(key) {
      if (!(key in object)) return;
      output += '      ' + JSON.stringify(key) + ': ' + JSON.stringify(object[key]) + ',\n';
    });
    output +=   '      "locations": ' + JSON.stringify(object.locations) + '\n';
    output +=   '    }';
    if (i < level.objects.length - 1) output += ',';
    output +=   '\n';
  }
  output +=     '  ]\n';
  output +=     '}';

  // sanity check
  var shouldBeTheSame = JSON.parse(output);
  if (!deepEquals(level, shouldBeTheSame)) throw asdf; // serialization is broken

  return output;
}

loadLevel(validateLevel(level1));
