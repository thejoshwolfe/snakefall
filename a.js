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
    0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,1,2,2,2,2,1,2,2,2,1,1,1,2,2,2,2,1,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ],
  "objects": [
    {
      "type": "snake",
      "color": 1,
      "dead": false,
      "locations": [184]
    },
    {
      "type": "fruit",
      "locations": [89]
    },
    {
      "type": "snake",
      "color": 0,
      "dead": false,
      "locations": [64,65,90,115,114,113,88,63]
    },
    {
      "type": "fruit",
      "locations": [227]
    },
    {
      "type": "fruit",
      "locations": [252]
    },
    {
      "type": "snake",
      "color": 2,
      "dead": false,
      "locations": [254,253,278]
    }
  ]
};
var tileSize = 30;
var level;
var unmoveBuffer = [];
function loadLevel(newLevel) {
  level = newLevel;

  activateAnySnakePlease();
  unmoveBuffer = [];
  pushUnmoveFrame();
  pushUneditFrame();
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
        if (snakeColors[object.color] == null) throw new Error("invalid color: " + JSON.stringify(object.color));
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

var SHIFT = 1;
var CTRL = 2;
var ALT = 4;
document.addEventListener("keydown", function(event) {
  var modifierMask = (
    (event.shiftKey ? SHIFT : 0) |
    (event.ctrlKey ? CTRL : 0) |
    (event.altKey ? ALT : 0)
  );
  switch (event.keyCode) {
    case 37: // left
      if (modifierMask === 0) { move(0, -1); break; }
      return;
    case 38: // up
      if (modifierMask === 0) { move(-1, 0); break; }
      return;
    case 39: // right
      if (modifierMask === 0) { move(0, 1); break; }
      return;
    case 40: // down
      if (modifierMask === 0) { move(1, 0); break; }
      return;
    case 8:  // backspace
    case "Z".charCodeAt(0):
      if (modifierMask === 0) { unmove(); break; }
      if (modifierMask === CTRL) { unedit(); break; }
      return;
    case "R".charCodeAt(0):
      if (modifierMask === 0) { reset(); break; }
      if (modifierMask === SHIFT) { setPaintBrushTileCode("select"); break; }
      return;

    case 220: // backslash
      if (modifierMask === 0) { toggleShowEditor(); break; }
      return;
    case "A".charCodeAt(0):
      if (modifierMask === CTRL) { selectAll(); break; }
      return;
    case "E".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(SPACE); break; }
      return;
    case "W".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(WALL); break; }
      return;
    case "S".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(SPIKE); break; }
      return;
    case "X".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(EXIT); break; }
      if (modifierMask === CTRL) { cutSelection(); break; }
      return;
    case "F".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode("fruit"); break; }
      return;
    case "D".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode("snake"); break; }
      return;
    case "B".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode("block"); break; }
      return;
    case "G".charCodeAt(0):
      if (modifierMask === 0) { toggleGravity(); break; }
      return;
    case "C".charCodeAt(0):
      if (modifierMask === 0) { toggleCollision(); break; }
      if (modifierMask === CTRL) { copySelection(); break; }
      return;
    case "V".charCodeAt(0):
      if (modifierMask === CTRL) { setPaintBrushTileCode("paste"); break; }
      return;
    case 32: // spacebar
    case 9:  // tab
      if (modifierMask === 0) {
        if (isAlive()) {
          var snakes = getSnakes();
          for (var i = 0; i < snakes.length; i++) {
            if (snakes[i].color !== activeSnakeColor) continue;
            activeSnakeColor = snakes[(i + 1) % snakes.length].color;
            break;
          }
        }
        break;
      }
      return;
    case 27: // escape
      if (modifierMask === 0) {
        setPaintBrushTileCode(null);
        break;
      }
      return;
    default: return;
  }
  event.preventDefault();
  render();
});
document.getElementById("showHideEditor").addEventListener("click", function() {
  toggleShowEditor();
});
function toggleShowEditor() {
  persistentState.showEditor = !persistentState.showEditor;
  savePersistentState();
  showEditorChanged();
}
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

var paintBrushTileCode = null;
var paintBrushSnakeColorIndex = 0;
var paintBrushBlockColorIndex = 0;
var paintBrushObject = null;
var selectionStart = null;
var selectionEnd = null;
var clipboardData = null;
var clipboardOffsetRowcol = null;
var paintButtonIdAndTileCodes = [
  ["selectButton", "select"],
  ["pasteButton", "paste"],
  ["paintSpaceButton", SPACE],
  ["paintWallButton",  WALL],
  ["paintSpikeButton", SPIKE],
  ["paintExitButton", EXIT],
  ["paintFruitButton", "fruit"],
  ["paintSnakeButton", "snake"],
  ["paintBlockButton", "block"],
];
paintButtonIdAndTileCodes.forEach(function(pair) {
  var id = pair[0];
  var tileCode = pair[1];
  document.getElementById(id).addEventListener("click", function() {
    setPaintBrushTileCode(tileCode);
  });
});
document.getElementById("copyButton").addEventListener("click", function() {
  copySelection();
});
document.getElementById("cutButton").addEventListener("click", function() {
  cutSelection();
});
document.getElementById("cheatGravityButton").addEventListener("click", function() {
  toggleGravity();
});
document.getElementById("cheatCollisionButton").addEventListener("click", function() {
  toggleCollision();
});
function toggleGravity() {
  isGravityEnabled = !isGravityEnabled;
  isCollisionEnabled = true;
  refreshCheatButtonText();
}
function toggleCollision() {
  isCollisionEnabled = !isCollisionEnabled;
  isGravityEnabled = false;
  refreshCheatButtonText();
}
function refreshCheatButtonText() {
  document.getElementById("cheatGravityButton").value = isGravityEnabled ? "Gravity: ON" : "Gravity: OFF";
  document.getElementById("cheatGravityButton").style.background = isGravityEnabled ? "" : "#f88";

  document.getElementById("cheatCollisionButton").value = isCollisionEnabled ? "Collision: ON" : "Collision: OFF";
  document.getElementById("cheatCollisionButton").style.background = isCollisionEnabled ? "" : "#f88";
}

var lastDraggingLocation = null;
var hoverLocation = null;
canvas.addEventListener("mousedown", function(event) {
  if (event.altKey) return;
  if (event.button !== 0) return;
  if (!persistentState.showEditor || paintBrushTileCode == null) return;
  event.preventDefault();
  var location = getLocationFromEvent(event);
  lastDraggingLocation = location;
  if (paintBrushTileCode === "select") selectionStart = location;
  paintAtLocation(lastDraggingLocation);
});
document.addEventListener("mouseup", function(event) {
  lastDraggingLocation = null;
  paintBrushObject = null;
  pushUneditFrame();
});
canvas.addEventListener("mousemove", function(event) {
  if (!persistentState.showEditor) return;
  var location = getLocationFromEvent(event);
  if (lastDraggingLocation != null) {
    // Dragging Force - Through the Fruit and Flames
    var path = getNaiveOrthogonalPath(lastDraggingLocation, location);
    path.forEach(paintAtLocation);
    lastDraggingLocation = location;
    hoverLocation = null;
  } else {
    // hovering
    if (hoverLocation !== location) {
      hoverLocation = location;
      render();
    }
  }
});
canvas.addEventListener("mouseout", function() {
  if (hoverLocation !== location) {
    // turn off the hover when the mouse leaves
    hoverLocation = null;
    render();
  }
});
function getLocationFromEvent(event) {
  var r = Math.floor(eventToMouseY(event, canvas) / tileSize);
  var c = Math.floor(eventToMouseX(event, canvas) / tileSize);
  return getLocation(level, r, c);
}
function eventToMouseX(event, canvas) { return event.clientX - canvas.getBoundingClientRect().left; }
function eventToMouseY(event, canvas) { return event.clientY - canvas.getBoundingClientRect().top; }

function selectAll() {
  selectionStart = 0;
  selectionEnd = level.map.length - 1;
  setPaintBrushTileCode("select");
}

function setPaintBrushTileCode(tileCode) {
  if (tileCode === "paste") {
    // make sure we have something to paste
    if (clipboardData == null) return;
  }
  if (paintBrushTileCode === "select" && tileCode !== "select" && selectionStart != null && selectionEnd != null) {
    // usually this means to fill in the selection
    if (tileCode == null) {
      // cancel selection
      selectionStart = null;
      selectionEnd = null;
      return;
    }
    if (typeof tileCode === "number" && tileCode !== EXIT) {
      // fill in the selection
      fillSelection(tileCode);
      selectionStart = null;
      selectionEnd = null;
      return;
    }
    // ok, just select something else then.
    selectionStart = null;
    selectionEnd = null;
  }
  if (tileCode === "snake") {
    if (paintBrushTileCode === "snake") {
      // next snake color
      paintBrushSnakeColorIndex = (paintBrushSnakeColorIndex + 1) % snakeColors.length;
    }
  } else if (tileCode === "block") {
    if (paintBrushTileCode === "block") {
      // next block color
      paintBrushBlockColorIndex = (paintBrushBlockColorIndex + 1) % blockColors.length;
    }
  }
  paintBrushTileCode = tileCode;
  paintBrushTileCodeChanged();
}
function paintBrushTileCodeChanged() {
  paintButtonIdAndTileCodes.forEach(function(pair) {
    var id = pair[0];
    var tileCode = pair[1];
    var backgroundStyle = "";
    if (tileCode === paintBrushTileCode) {
      if (tileCode === "snake") {
        backgroundStyle = snakeColors[paintBrushSnakeColorIndex];
      } else if (tileCode === "block") {
        backgroundStyle = blockColors[paintBrushBlockColorIndex].foreground;
      } else {
        backgroundStyle = "#ff0";
      }
    }
    document.getElementById(id).style.background = backgroundStyle;
  });

  var isSelectionMode = paintBrushTileCode === "select";
  ["cutButton", "copyButton"].forEach(function (id) {
    document.getElementById(id).disabled = !isSelectionMode;
  });
  document.getElementById("pasteButton").disabled = clipboardData == null;

  render();
}

function cutSelection() {
  copySelection();
  fillSelection(SPACE);
  render();
}
function copySelection() {
  var selectedLocations = getSelectedLocations();
  if (selectedLocations.length === 0) return;
  var selectedObjects = [];
  selectedLocations.forEach(function(location) {
    var object = findObjectAtLocation(location);
    if (object != null) addIfNotPresent(selectedObjects, object);
  });
  setClipboardData({
    level: JSON.parse(stringifyLevel(level)),
    selectedLocations: selectedLocations,
    selectedObjects: selectedObjects,
  });
}
function setClipboardData(data) {
  // find the center
  var minR = Infinity;
  var maxR = -Infinity;
  var minC = Infinity;
  var maxC = -Infinity;
  data.selectedLocations.forEach(function(location) {
    var rowcol = getRowcol(data.level, location);
    if (rowcol.r < minR) minR = rowcol.r;
    if (rowcol.r > maxR) maxR = rowcol.r;
    if (rowcol.c < minC) minC = rowcol.c;
    if (rowcol.c > maxC) maxC = rowcol.c;
  });
  var offsetR = Math.floor((minR + maxR) / 2);
  var offsetC = Math.floor((minC + maxC) / 2);

  clipboardData = data;
  clipboardOffsetRowcol = {r:offsetR, c:offsetC};
  paintBrushTileCodeChanged();
}
function fillSelection(tileCode) {
  var locations = getSelectedLocations();
  var objects = [];
  locations.forEach(function(location) {
    level.map[location] = tileCode;
    var object = findObjectAtLocation(location);
    if (object != null) addIfNotPresent(objects, object);
  });
  objects.forEach(removeObject);
  pushUneditFrame();
}
function getSelectedLocations() {
  if (selectionStart == null || selectionEnd == null) return [];
  var rowcol1 = getRowcol(level, selectionStart);
  var rowcol2 = getRowcol(level, selectionEnd);
  var r1 = rowcol1.r;
  var c1 = rowcol1.c;
  var r2 = rowcol2.r;
  var c2 = rowcol2.c;
  if (r2 < r1) {
    var tmp = r1;
    r1 = r2;
    r2 = tmp;
  }
  if (c2 < c1) {
    var tmp = c1;
    c1 = c2;
    c2 = tmp;
  }
  var objects = [];
  var locations = [];
  for (var r = r1; r <= r2; r++) {
    for (var c = c1; c <= c2; c++) {
      var location = getLocation(level, r, c);
      locations.push(location);
      var object = findObjectAtLocation(location);
      if (object != null) addIfNotPresent(objects, object);
    }
  }
  // select the rest of any partially-selected objects
  objects.forEach(function(object) {
    object.locations.forEach(function(location) {
      addIfNotPresent(locations, location);
    });
  });
  return locations;
}

function newFruit(location) {
  return {
    type: "fruit",
    locations: [location],
  };
}
function newSnake(color, location) {
  return {
    type: "snake",
    color: color,
    dead: false,
    locations: [location],
  };
}
function newBlock(color, location) {
  return {
    type: "block",
    color: color,
    locations: [location],
  };
}
function paintAtLocation(location) {
  // what have we got here?
  var objectHere = findObjectAtLocation(location);
  if (typeof paintBrushTileCode === "number") {
    if (objectHere == null && level.map[location] === paintBrushTileCode) return;
  } else if (paintBrushTileCode === "select") {
    // don't delete things while selecting
    objectHere = null;
  } else if (paintBrushTileCode === "paste") {
    // we've got a different check for this
    objectHere = null;
  } else if (typeof paintBrushTileCode === "string") {
    if (objectHere != null && objectHere.type === paintBrushTileCode) {
      if (paintBrushTileCode === "fruit") {
        // all fruit is the same
        return;
      } else if (paintBrushTileCode === "snake") {
        // only ignore this paint request if we're already clicking our own head
        if (objectHere.type === "snake" && objectHere.color === paintBrushSnakeColorIndex) {
          if (objectHere.locations[0] === location) return; // that's the head
          // we might be self-intersecting
          var selfIntersectionIndex = objectHere.locations.indexOf(location);
          if (selfIntersectionIndex !== -1) {
            // truncate from here back
            objectHere.locations.splice(selfIntersectionIndex);
            // ok, this object is cool.
            objectHere = null;
          }
        }
      } else if (paintBrushTileCode === "block") {
        if (objectHere.type === "block" && objectHere.color == paintBrushBlockColorIndex) {
          // there's special code for reclicking a block you're editing.
          // don't blindly delete the object
          objectHere = null;
        }
      }
    }
  }
  if (objectHere != null) removeObject(objectHere);

  if (paintBrushTileCode === "snake" && paintBrushObject == null) {
    // new snake. make sure any old snake of the same color is gone.
    var oldSnake = findSnakeOfColor(paintBrushSnakeColorIndex);
    if (oldSnake != null) removeObject(oldSnake);
  }

  if (typeof paintBrushTileCode === "number") {
    paintTileAtLocation(location, paintBrushTileCode);
  } else if (paintBrushTileCode === "select") {
    selectionEnd = location;
  } else if (paintBrushTileCode === "paste") {
    var hoverRowcol = getRowcol(level, location);
    var pastedData = previewPaste(hoverRowcol.r, hoverRowcol.c);
    pastedData.selectedLocations.forEach(function(location) {
      var tileCode = pastedData.level.map[location];
      var objectHere = findObjectAtLocation(location);
      if (objectHere != null) removeObject(objectHere);
      paintTileAtLocation(location, tileCode);
    });
    pastedData.selectedObjects.forEach(function(object) {
      if (object.color != null) {
        var otherObject = findObjectOfTypeAndColor(object.type, object.color);
        if (otherObject != null) removeObject(otherObject);
      }
      level.objects.push(object);
    });
  } else if (typeof paintBrushTileCode === "string") {
    // make sure there's space behind us
    level.map[location] = SPACE;
    switch (paintBrushTileCode) {
      case "fruit":
        var newObject = newFruit(location);
        level.objects.push(newObject);
        break;
      case "snake":
        if (paintBrushObject == null) {
          var thereWereNoSnakes = countSnakes() === 0;
          paintBrushObject = newSnake(paintBrushSnakeColorIndex, location);
          level.objects.push(paintBrushObject);
          if (thereWereNoSnakes) activateAnySnakePlease();
        } else {
          // extend le snake
          paintBrushObject.locations.unshift(location);
        }
        break;
      case "block":
        var thisBlock = findBlockOfColor(paintBrushBlockColorIndex);
        if (thisBlock == null) {
          thisBlock = newBlock(paintBrushBlockColorIndex, location);
          level.objects.push(thisBlock);
        } else {
          var existingIndex = thisBlock.locations.indexOf(location);
          if (existingIndex !== -1) {
            // reclicking part of this object means to delete just part of it.
            if (thisBlock.locations.length === 1) {
              removeObject(thisBlock);
            } else {
              thisBlock.locations.splice(existingIndex, 1);
            }
          } else {
            // add a tile to the block
            thisBlock.locations.push(location);
          }
        }
        break;
      default: throw asdf;
    }
  } else throw asdf;
  render();

  function paintTileAtLocation(location, tileCode) {
    level.map[location] = tileCode;
    if (tileCode === EXIT) {
      // delete any other exits
      for (var i = 0; i < level.map.length; i++) {
        if (i === location) continue;
        if (level.map[i] === EXIT) level.map[i] = SPACE;
      }
    }
  }
}

var uneditBuffer = [];
function pushUneditFrame() {
  if (uneditBuffer.length !== 0) {
    // don't duplicate states
    if (deepEquals(JSON.parse(uneditBuffer[uneditBuffer.length - 1]), level)) return;
  }
  uneditBuffer.push(JSON.stringify(level));
}
function unedit() {
  if (uneditBuffer.length <= 1) return; // already at the beginning
  uneditBuffer.pop(); // that was the current state
  level = JSON.parse(uneditBuffer[uneditBuffer.length - 1]);
  render();
}

var persistentState = {
  showEditor: false,
};
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
var isGravityEnabled = true;
function isGravity() {
  return isGravityEnabled || !persistentState.showEditor;
}
var isCollisionEnabled = true;
function isCollision() {
  return isCollisionEnabled || !persistentState.showEditor;
}
function showEditorChanged() {
  document.getElementById("showHideEditor").value = (persistentState.showEditor ? "Hide" : "Show") + " Editor Stuff";
  ["editorDiv", "editorPane"].forEach(function(id) {
    document.getElementById(id).style.display = persistentState.showEditor ? "block" : "none";
  });

  render();
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

  if (isCollision()) {
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
  }

  // move to empty space
  activeSnake.locations.unshift(newLocation);
  if (!ate) {
    activeSnake.locations.pop();
  }
  // push everything, too
  moveObjects(pushedObjects, dr, dc);

  // gravity loop
  while (isGravity()) {
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
  activeSnakeColor = snakes[0].color;
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
  if (object.type === "snake" && object.color === activeSnakeColor) {
    activateAnySnakePlease();
  }
}
function removeFromArray(array, element) {
  var index = array.indexOf(element);
  if (index === -1) throw asdf;
  array.splice(index, 1);
}
function findActiveSnake() {
  var snakes = getSnakes();
  for (var i = 0; i < snakes.length; i++) {
    if (snakes[i].color === activeSnakeColor) return snakes[i];
  }
  throw asdf;
}
function findBlockOfColor(color) {
  return findObjectOfTypeAndColor("block", color);
}
function findSnakeOfColor(color) {
  return findObjectOfTypeAndColor("snake", color);
}
function findObjectOfTypeAndColor(type, color) {
  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    if (object.type === type && object.color === color) return object;
  }
  return null;
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
var blockColors = [
  {foreground: "#800", background: "#400"},
  {foreground: "#820", background: "#410"},
  {foreground: "#802", background: "#401"},
  {foreground: "#822", background: "#411"},
];

var activeSnakeColor = null;

function render() {
  if (level == null) return;
  canvas.width = tileSize * level.width;
  canvas.height = tileSize * level.height;
  var context = canvas.getContext("2d");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // normal render
  renderLevel();

  if (persistentState.showEditor) {
    if (paintBrushTileCode === "block") {
      var activeBlock = findBlockOfColor(paintBrushBlockColorIndex);
      if (activeBlock != null) {
        // fade everything else away
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        // and render just this object in focus
        renderLevel([activeBlock]);
      }
    } else if (paintBrushTileCode === "select") {
      getSelectedLocations().forEach(function(location) {
        var rowcol = getRowcol(level, location);
        drawRect(rowcol.r, rowcol.c, "rgba(128, 128, 128, 0.3)");
      });
    }
  }

  // serialize
  document.getElementById("serializationTextarea").value = stringifyLevel(level);

  return; // this is the end of the function proper

  function renderLevel(onlyTheseObjects) {
    var objects = level.objects;
    if (onlyTheseObjects != null) objects = onlyTheseObjects;
    // begin by rendering the background connections for blocks
    objects.forEach(function(object) {
      if (object.type !== "block") return;
      var color = blockColors[object.color].background;
      for (var i = 0; i < object.locations.length - 1; i++) {
        var rowcol1 = getRowcol(level, object.locations[i]);
        var rowcol2 = getRowcol(level, object.locations[i + 1]);
        var cornerRowcol = {r:rowcol1.r, c:rowcol2.c};
        drawConnector(rowcol1.r, rowcol1.c, cornerRowcol.r, cornerRowcol.c, color);
        drawConnector(rowcol2.r, rowcol2.c, cornerRowcol.r, cornerRowcol.c, color);
      }
    });

    // terrain
    if (onlyTheseObjects == null) {
      for (var r = 0; r < level.height; r++) {
        for (var c = 0; c < level.width; c++) {
          var tileCode = level.map[getLocation(level, r, c)];
          drawTile(tileCode, r, c);
        }
      }
    }

    // objects
    objects.forEach(drawObject);

    // banners
    if (countSnakes() === 0) {
      context.fillStyle = "#ff0";
      context.font = "100px Arial";
      context.fillText("You Win!", 0, canvas.height / 2);
    }
    if (isDead()) {
      context.fillStyle = "#f00";
      context.font = "100px Arial";
      context.fillText("You Dead!", 0, canvas.height / 2);
    }

    // editor hover
    if (persistentState.showEditor && hoverLocation != null && paintBrushTileCode != null) {

      var savedContext = context;
      var buffer = document.createElement("canvas");
      buffer.width = canvas.width;
      buffer.height = canvas.height;
      context = buffer.getContext("2d");

      var hoverRowcol = getRowcol(level, hoverLocation);
      var objectHere = findObjectAtLocation(hoverLocation);
      if (typeof paintBrushTileCode === "number") {
        if (level.map[hoverLocation] !== paintBrushTileCode) {
          drawTile(paintBrushTileCode, hoverRowcol.r, hoverRowcol.c);
        }
      } else if (paintBrushTileCode === "fruit") {
        if (!(objectHere != null && objectHere.type === "fruit")) {
          drawObject(newFruit([hoverLocation]));
        }
      } else if (paintBrushTileCode === "snake") {
        if (!(objectHere != null && objectHere.type === "snake" && objectHere.color === paintBrushSnakeColorIndex)) {
          drawObject(newSnake(paintBrushSnakeColorIndex, hoverLocation));
        }
      } else if (paintBrushTileCode === "block") {
        if (!(objectHere != null && objectHere.type === "block" && objectHere.color === paintBrushBlockColorIndex)) {
          drawObject(newBlock(paintBrushSnakeColorIndex, hoverLocation));
        }
      } else if (paintBrushTileCode === "select") {
        void 0; // do nothing
      } else if (paintBrushTileCode === "paste") {
        // show what will be pasted if you click
        var pastedData = previewPaste(hoverRowcol.r, hoverRowcol.c);
        pastedData.selectedLocations.forEach(function(location) {
          var tileCode = pastedData.level.map[location];
          var rowcol = getRowcol(level, location);
          drawTile(tileCode, rowcol.r, rowcol.c);
        });
        pastedData.selectedObjects.forEach(drawObject);
      } else throw asdf;

      context = savedContext;
      context.save();
      context.globalAlpha = 0.2;
      context.drawImage(buffer, 0, 0);
      context.restore();
    }
  }
  function drawTile(tileCode, r, c) {
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

  function drawObject(object) {
    switch (object.type) {
      case "snake":
        var lastRowcol = null
        var color = snakeColors[object.color];
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          if (object.dead) rowcol.r += 0.5;
          if (lastRowcol == null) {
            // head
            if (object.color === activeSnakeColor) {
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
        var color = blockColors[object.color].foreground;
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          drawRect(rowcol.r, rowcol.c, color);
        });
        break;
      case "fruit":
        var rowcol = getRowcol(level, object.locations[0]);
        drawCircle(rowcol.r, rowcol.c, "#f0f");
        break;
      default: throw asdf;
    }
  }

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
  function drawConnector(r1, c1, r2, c2, color) {
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
    context.fillStyle = color;
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

function stringifyLevel(level) {
  // we could just JSON.stringify, but that's kinda ugly and non-deterministic.
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
    ["color", "dead"].forEach(function(key) {
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

function previewPaste(hoverR, hoverC) {
  var offsetR = hoverR - clipboardOffsetRowcol.r;
  var offsetC = hoverC - clipboardOffsetRowcol.c;

  var newLevel = JSON.parse(stringifyLevel(level));
  var selectedLocations = [];
  var selectedObjects = [];
  clipboardData.selectedLocations.forEach(function(location) {
    var tileCode = clipboardData.level.map[location];
    var rowcol = getRowcol(clipboardData.level, location);
    var r = rowcol.r + offsetR;
    var c = rowcol.c + offsetC;
    if (!isInBounds(newLevel, r, c)) return;
    var newLocation = getLocation(newLevel, r, c);
    newLevel.map[newLocation] = tileCode;
    selectedLocations.push(newLocation);
  });
  clipboardData.selectedObjects.forEach(function(object) {
    var newLocations = [];
    for (var i = 0; i < object.locations.length; i++) {
      var rowcol = getRowcol(clipboardData.level, object.locations[i]);
      rowcol.r += offsetR;
      rowcol.c += offsetC;
      if (!isInBounds(newLevel, rowcol.r, rowcol.c)) {
        // this location is oob
        if (object.type === "snake") {
          // snakes must be completely in bounds
          return;
        }
        // just skip it
        continue;
      }
      var newLocation = getLocation(newLevel, rowcol.r, rowcol.c);
      newLocations.push(newLocation);
    }
    if (newLocations.length === 0) return; // can't have a non-present object
    var newObject = JSON.parse(JSON.stringify(object));
    newObject.locations = newLocations;
    selectedObjects.push(newObject);
  });
  return {
    level: newLevel,
    selectedLocations: selectedLocations,
    selectedObjects: selectedObjects,
  };
}

function getNaiveOrthogonalPath(a, b) {
  // does not include a, but does include b.
  var rowcolA = getRowcol(level, a);
  var rowcolB = getRowcol(level, b);
  var path = [];
  if (rowcolA.r < rowcolB.r) {
    for (var r = rowcolA.r; r < rowcolB.r; r++) {
      path.push(getLocation(level, r + 1, rowcolA.c));
    }
  } else {
    for (var r = rowcolA.r; r > rowcolB.r; r--) {
      path.push(getLocation(level, r - 1, rowcolA.c));
    }
  }
  if (rowcolA.c < rowcolB.c) {
    for (var c = rowcolA.c; c < rowcolB.c; c++) {
      path.push(getLocation(level, rowcolB.r, c + 1));
    }
  } else {
    for (var c = rowcolA.c; c > rowcolB.c; c--) {
      path.push(getLocation(level, rowcolB.r, c - 1));
    }
  }
  return path;
}

loadPersistentState();
loadLevel(validateLevel(level1));
