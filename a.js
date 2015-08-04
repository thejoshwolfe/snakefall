var canvas = document.getElementById("canvas");

var SPACE = 0;
var WALL = 1;
var SPIKE = 2;
var FRUIT = 3;
var EXIT = 4;
var validTileCodes = [SPACE, WALL, SPIKE, FRUIT, EXIT];

var tileSize = 30;
var level;
var unmoveStuff = {buffer:[], cursor:0, spanId:"movesSpan", redoButtonId:"removeButton"};
var uneditStuff = {buffer:[], cursor:0, spanId:"editsSpan", redoButtonId:"reeditButton"};
var previousState = null;
function loadLevel(newLevel) {
  level = newLevel;

  activateAnySnakePlease();
  unmoveStuff.buffer = []
  unmoveStuff.cursor = 0;
  uneditStuff.buffer = []
  uneditStuff.cursor = 0;
  pushUndo(unmoveStuff);
  pushUndo(uneditStuff);
  render();
}


var magicNumber = "3tFRIoTUvKlphLYY";
var exampleLevel = magicNumber + "&" + "v0" + "&" +
  "17&29" +
  "?" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00000000000011111000000000000" +
    "00000000001110001110000000000" +
    "00000000000000300000000000000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00300000000000100000000000400" +
    "00300000000000100000000000000" +
    "00001220000221112200002210000" +
    "00001110111111111111101110000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
    "00000000000000000000000000000" +
  "/" +
  "s0" + "?323&322&351/" +
  "s1" + "?43/" +
  "s2" + "?101&102&131&160&159&158&129&100/";
function parseLevel(string) {
  // magic number
  var cursor = 0;
  skipWhitespace();
  if (string.indexOf(magicNumber) !== 0) throw new Error("not a snakefall level");
  cursor += magicNumber.length;
  consumeKeyword("&");

  // version number
  consumeKeyword("v");
  var version = readInt();
  if (version !== 0) throw parserError("expected version 0");
  consumeKeyword("&");

  var level = {
    height: -1,
    width: -1,
    map: [],
    objects: [],
  };

  // height, width
  level.height = readInt();
  consumeKeyword("&");
  level.width = readInt();

  // map
  var mapData = readRun();
  mapData = mapData.replace(/\s+/g, "");
  if (level.height * level.width !== mapData.length) throw parserError("height, width, and map.length do not jive");
  for (var i = 0; i < mapData.length; i++) {
    var tileCode = mapData[i].charCodeAt(0) - "0".charCodeAt(0);
    if (validTileCodes.indexOf(tileCode) === -1) throw parserError("invalid tilecode: " + JSON.stringify(mapData[i]));
    level.map.push(tileCode);
  }

  // objects
  skipWhitespace();
  while (cursor < string.length) {
    var object = {
      type: "?",
      color: -1,
      dead: false,
      locations: [],
    };

    // type
    object.type = string[cursor];
    var colorArray;
    if      (object.type === "s") { colorArray = snakeColors; }
    else if (object.type === "b") { colorArray = blockColors; }
    else throw parserError("expected object type code");
    cursor += 1;

    // color
    object.color = readInt();
    if (colorArray[object.color] == null) throw parserError("invalid color index");

    // locations
    var locationsData = readRun();
    var locationStrings = locationsData.split("&");
    if (locationStrings.length === 0) throw parserError("locations must be non-empty");
    locationStrings.forEach(function(locationString) {
      var location = parseInt(locationString);
      if (!isTileCodeAir(level.map[location])) throw parserError("location must be air-like: " + JSON.stringify(locationString));
      object.locations.push(location);
    });

    level.objects.push(object);
    skipWhitespace();
  }

  return level;

  function skipWhitespace() {
    while (" \n\t\r".indexOf(string[cursor]) !== -1) {
      cursor += 1;
    }
  }
  function consumeKeyword(keyword) {
    skipWhitespace();
    if (string.indexOf(keyword, cursor) !== cursor) throw parserError("expected " + JSON.stringify(keyword));
    cursor += 1;
  }
  function readInt() {
    skipWhitespace();
    for (var i = cursor; i < string.length; i++) {
      if ("0123456789".indexOf(string[i]) === -1) break;
    }
    var substring = string.substring(cursor, i);
    if (substring.length === 0) throw parserError("expected int");
    cursor = i;
    return parseInt(substring, 10);
  }
  function readRun() {
    consumeKeyword("?");
    var endIndex = string.indexOf("/", cursor);
    var substring = string.substring(cursor, endIndex);
    cursor = endIndex + 1;
    return substring;
  }
  function parserError(message) {
    return new Error("parse error at position " + cursor + ": " + message);
  }
}

function stringifyLevel(level) {
  var output = magicNumber + "&";
  output += "v0&\n";
  output += level.height + "&" + level.width + "\n";

  output += "?\n";
  for (var r = 0; r < level.height; r++) {
    output += "  " + level.map.slice(r * level.width, (r + 1) * level.width).join("") + "\n";
  }
  output += "/\n";

  for (var i = 0; i < level.objects.length; i++) {
    var object = level.objects[i];
    output += object.type + object.color + " ";
    output += "?" + object.locations.join("&") + "/\n";
  }

  // sanity check
  var shouldBeTheSame = parseLevel(output);
  if (!deepEquals(level, shouldBeTheSame)) throw asdf; // serialization/deserialization is broken

  return output;
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
      if (modifierMask === 0)     { undo(unmoveStuff); break; }
      if (modifierMask === SHIFT) { redo(unmoveStuff); break; }
      return;
    case "Q".charCodeAt(0):
      if (modifierMask === 0)     { undo(unmoveStuff); break; }
      if (modifierMask === SHIFT) { redo(unmoveStuff); break; }
      return;
    case "Z".charCodeAt(0):
      if (modifierMask === 0)     { undo(unmoveStuff); break; }
      if (modifierMask === SHIFT) { redo(unmoveStuff); break; }
      if (persistentState.showEditor && modifierMask === CTRL)        { undo(uneditStuff); break; }
      if (persistentState.showEditor && modifierMask === CTRL|SHIFT)  { redo(uneditStuff); break; }
      return;
    case "Y".charCodeAt(0):
      if (modifierMask === 0)     { redo(unmoveStuff); break; }
      if (persistentState.showEditor && modifierMask === CTRL)  { redo(uneditStuff); break; }
      return;
    case "R".charCodeAt(0):
      if (modifierMask === 0) { reset(unmoveStuff); break; }
      if (modifierMask === SHIFT) { setPaintBrushTileCode("select"); break; }
      return;

    case 13:  // Enter
      if (modifierMask === 0) { playtest(); break; }
      return;
    case 220: // backslash
      if (modifierMask === 0) { toggleShowEditor(); break; }
      return;
    case "A".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(0, -1); break; }
      if ( persistentState.showEditor && modifierMask === CTRL) { selectAll(); break; }
      return;
    case "E".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(SPACE); break; }
      return;
    case "W".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(-1, 0); break; }
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(WALL); break; }
      return;
    case "S".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(1, 0); break; }
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(SPIKE); break; }
      if ( persistentState.showEditor && modifierMask === SHIFT) { setPaintBrushTileCode("resize"); break; }
      return;
    case "X".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(EXIT); break; }
      if (modifierMask === CTRL) { cutSelection(); break; }
      return;
    case "F".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode(FRUIT); break; }
      return;
    case "D".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(0, 1); break; }
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode("s"); break; }
      return;
    case "B".charCodeAt(0):
      if (modifierMask === 0) { setPaintBrushTileCode("b"); break; }
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
        switchSnakes();
        break;
      }
      return;
    case "1".charCodeAt(0):
    case "2".charCodeAt(0):
    case "3".charCodeAt(0):
    case "4".charCodeAt(0):
      var index = event.keyCode - "1".charCodeAt(0);
      if (modifierMask === 0) {
        if (isAlive()) {
          if (findSnakeOfColor(index) != null) {
            activeSnakeColor = index;
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

document.getElementById("switchSnakesButton").addEventListener("click", function() {
  switchSnakes();
  render();
});
function switchSnakes() {
  if (!isAlive()) return;
  var snakes = getSnakes();
  for (var i = 0; i < snakes.length; i++) {
    if (snakes[i].color !== activeSnakeColor) continue;
    activeSnakeColor = snakes[(i + 1) % snakes.length].color;
    return;
  }
}
document.getElementById("restartButton").addEventListener("click", function() {
  reset(unmoveStuff);
  render();
});
document.getElementById("unmoveButton").addEventListener("click", function() {
  undo(unmoveStuff);
  render();
});
document.getElementById("removeButton").addEventListener("click", function() {
  redo(unmoveStuff);
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
["serializationTextarea", "shareLinkTextbox"].forEach(function(id) {
  document.getElementById(id).addEventListener("keydown", function(event) {
    // let things work normally
    event.stopPropagation();
  });
});
document.getElementById("submitSerializationButton").addEventListener("click", function() {
  var string = document.getElementById("serializationTextarea").value;
  try {
    var newLevel = parseLevel(string);
  } catch (e) {
    alert(e);
    return;
  }
  loadLevel(newLevel);
});
document.getElementById("shareLinkTextbox").addEventListener("focus", function() {
  setTimeout(function() {
    document.getElementById("shareLinkTextbox").select();
  }, 0);
});

var paintBrushTileCode = null;
var paintBrushSnakeColorIndex = 0;
var paintBrushBlockColorIndex = 0;
var paintBrushObject = null;
var selectionStart = null;
var selectionEnd = null;
var resizeDragAnchorRowcol = null;
var clipboardData = null;
var clipboardOffsetRowcol = null;
var paintButtonIdAndTileCodes = [
  ["resizeButton", "resize"],
  ["selectButton", "select"],
  ["pasteButton", "paste"],
  ["paintSpaceButton", SPACE],
  ["paintWallButton",  WALL],
  ["paintSpikeButton", SPIKE],
  ["paintExitButton", EXIT],
  ["paintFruitButton", FRUIT],
  ["paintSnakeButton", "s"],
  ["paintBlockButton", "b"],
];
paintButtonIdAndTileCodes.forEach(function(pair) {
  var id = pair[0];
  var tileCode = pair[1];
  document.getElementById(id).addEventListener("click", function() {
    setPaintBrushTileCode(tileCode);
  });
});
document.getElementById("playtestButton").addEventListener("click", function() {
  playtest();
});
document.getElementById("uneditButton").addEventListener("click", function() {
  undo(uneditStuff);
  render();
});
document.getElementById("reeditButton").addEventListener("click", function() {
  redo(uneditStuff);
  render();
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

// be careful with location vs rowcol, because this variable is used when resizing
var lastDraggingRowcol = null;
var hoverLocation = null;
canvas.addEventListener("mousedown", function(event) {
  if (event.altKey) return;
  if (event.button !== 0) return;
  if (!persistentState.showEditor || paintBrushTileCode == null) return;
  event.preventDefault();
  var location = getLocationFromEvent(event);
  lastDraggingRowcol = getRowcol(level, location);
  if (paintBrushTileCode === "select") selectionStart = location;
  if (paintBrushTileCode === "resize") resizeDragAnchorRowcol = lastDraggingRowcol;
  paintAtLocation(location);
});
document.addEventListener("mouseup", function(event) {
  if (lastDraggingRowcol != null) {
    lastDraggingRowcol = null;
    paintBrushObject = null;
    resizeDragAnchorRowcol = null;
    pushUndo(uneditStuff);
  }
});
canvas.addEventListener("mousemove", function(event) {
  if (!persistentState.showEditor) return;
  var location = getLocationFromEvent(event);
  var mouseRowcol = getRowcol(level, location);
  if (lastDraggingRowcol != null) {
    // Dragging Force - Through the Fruit and Flames
    var lastDraggingLocation = getLocation(level, lastDraggingRowcol.r, lastDraggingRowcol.c);
    // we need to get rowcols for everything before we start dragging, because dragging might resize the world.
    var path = getNaiveOrthogonalPath(lastDraggingLocation, location).map(function(location) {
      return getRowcol(level, location);
    });
    path.forEach(function(rowcol) {
      // convert to location at the last minute in case each of these steps is changing the coordinate system.
      paintAtLocation(getLocation(level, rowcol.r, rowcol.c));
    });
    lastDraggingRowcol = mouseRowcol;
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
  if (tileCode === "s") {
    if (paintBrushTileCode === "s") {
      // next snake color
      paintBrushSnakeColorIndex = (paintBrushSnakeColorIndex + 1) % snakeColors.length;
    }
  } else if (tileCode === "b") {
    if (paintBrushTileCode === "b") {
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
      if (tileCode === "s") {
        backgroundStyle = snakeColors[paintBrushSnakeColorIndex];
      } else if (tileCode === "b") {
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
    level: JSON.parse(JSON.stringify(level)),
    selectedLocations: selectedLocations,
    selectedObjects: JSON.parse(JSON.stringify(selectedObjects)),
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
  pushUndo(uneditStuff);
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

function removeRow() {
  var r = level.height - 1;
  for (var c = 0; c < level.width; c++) {
    var object = findObjectAtLocation(getLocation(level, r, c));
    if (object != null) removeObject(object);
  }
  level.map.splice(getLocation(level, r, 0));
  level.height -= 1;
}
function addRow() {
  for (var c = 0; c < level.width; c++) {
    level.map.push(SPACE);
  }
  level.height += 1;
}
function removeCol() {
  var c = level.width - 1;
  for (var r = 0; r < level.height; r++) {
    var object = findObjectAtLocation(getLocation(level, r, c));
    if (object != null) removeObject(object);
  }
  for (var r = level.height - 1; r >= 0; r--) {
    level.map.splice(getLocation(level, r, c), 1);
  }

  level.objects.forEach(function(object) {
    for (var i = 0; i < object.locations.length; i++) {
      object.locations[i] = Math.floor((object.locations[i] + 1) * (level.width - 1) / level.width);
    }
  });

  level.width -= 1;
}
function addCol() {
  var c = level.width - 1;
  for (var r = level.height - 1; r >= 0; r--) {
    level.map.splice(getLocation(level, r, c) + 1, 0, SPACE);
  }

  level.objects.forEach(function(object) {
    for (var i = 0; i < object.locations.length; i++) {
      object.locations[i] = Math.floor(object.locations[i] * (level.width + 1) / level.width);
    }
  });

  level.width += 1;
}

function newSnake(color, location) {
  return {
    type: "s",
    color: color,
    dead: false,
    locations: [location],
  };
}
function newBlock(color, location) {
  return {
    type: "b",
    color: color,
    dead: false, // unused
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
  } else if (paintBrushTileCode === "resize") {
    // don't delete things under the mouse while resizing
    objectHere = null;
  } else if (paintBrushTileCode === "paste") {
    // we've got a different check for this
    objectHere = null;
  } else if (typeof paintBrushTileCode === "string") {
    if (objectHere != null && objectHere.type === paintBrushTileCode) {
      if (paintBrushTileCode === "s") {
        // only ignore this paint request if we're already clicking our own head
        if (objectHere.type === "s" && objectHere.color === paintBrushSnakeColorIndex) {
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
      } else if (paintBrushTileCode === "b") {
        if (objectHere.type === "b" && objectHere.color == paintBrushBlockColorIndex) {
          // there's special code for reclicking a block you're editing.
          // don't blindly delete the object
          objectHere = null;
        }
      } else throw asdf;
    }
  }
  if (objectHere != null) removeObject(objectHere);

  if (paintBrushTileCode === "s" && paintBrushObject == null) {
    // new snake. make sure any old snake of the same color is gone.
    var oldSnake = findSnakeOfColor(paintBrushSnakeColorIndex);
    if (oldSnake != null) removeObject(oldSnake);
  }

  if (typeof paintBrushTileCode === "number") {
    paintTileAtLocation(location, paintBrushTileCode);
  } else if (paintBrushTileCode === "resize") {
    var toRowcol = getRowcol(level, location);
    var dr = toRowcol.r - resizeDragAnchorRowcol.r;
    var dc = toRowcol.c - resizeDragAnchorRowcol.c;
    resizeDragAnchorRowcol = toRowcol;
    if (dr < 0) removeRow();
    if (dr > 0) addRow();
    if (dc < 0) removeCol();
    if (dc > 0) addCol();
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
      case "s":
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
      case "b":
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
    if (tileCode === EXIT) {
      // delete any other exits
      for (var i = 0; i < level.map.length; i++) {
        if (level.map[i] === EXIT) level.map[i] = SPACE;
      }
    }
    level.map[location] = tileCode;
  }
}

function playtest() {
  unmoveStuff.buffer = [];
  unmoveStuff.cursor = 0;
  pushUndo(unmoveStuff);
}

function pushUndo(undoStuff) {
  // frame = [
  //   "m0123", // map changed from 0 to 1 at location 23
  //   "s00[1,2]0[2,3]", // snake color 0 moved from alive at [1, 2] to alive at [2, 3]
  //   "s10[11,12]1[12,13]", // snake color 1 moved from alive at [11, 12] to dead at [12, 13]
  //   "b10[20,30]0[]", // block color 1 was deleted from location [20, 30]
  // ];
  var frame = null;

  var currentStateString = JSON.stringify(level);
  if (previousState != null) {
    frame = diffStates(previousState, level);
    if (frame.length === 0) return; // don't push a do-nothing frame
    undoStuff.buffer.splice(undoStuff.cursor);
    undoStuff.buffer.push(frame);
    undoStuff.cursor += 1;
  }
  previousState = JSON.parse(currentStateString);
  undoStuffChanged(undoStuff);

  function diffStates(level1, level2) {
    var changes = [];
    // size
    var height = Math.min(level1.height, level2.height);
    var width = Math.min(level1.width, level2.width);
    if (level1.height !== level2.height) throw asdf; // TODO
    if (level1.width !== level2.width) throw asdf; // TODO
    // map
    for (var r = 0; r < height; r++) {
      for (var c = 0; c < width; c++) {
        var tileCode1 = level1.map[getLocation(level1, r, c)];
        var location2 = getLocation(level2, r, c);
        var tileCode2 = level2.map[location2];
        if (tileCode1 !== tileCode2) {
          changes.push("m" + tileCode1 + tileCode2 + location2);
        }
      }
    }
    // objects
    var objectIds = [];
    [level1, level1].forEach(function(level) {
      level.objects.forEach(function(object) {
        var id = object.type + object.color;
        addIfNotPresent(objectIds, id);
      });
    });
    objectIds.forEach(function(id) {
      var object1 = level1.objects.filter(function(object) { return object.type + object.color === id; })[0];
      var object2 = level2.objects.filter(function(object) { return object.type + object.color === id; })[0];
      var dead1 = (object1 == null ? false : object1.dead) ? "1" : "0";
      var dead2 = (object2 == null ? false : object2.dead) ? "1" : "0";
      var locations1 = JSON.stringify(object1 == null ? [] : object1.locations);
      var locations2 = JSON.stringify(object2 == null ? [] : object2.locations);
      if (locations1 === locations2) return;
      changes.push(id + dead1 + locations1 + dead2 + locations2);
    });
    return changes;
  }
}

function undo(undoStuff) {
  if (undoStuff.cursor === 0) return; // already at the beginning
  undoStuff.cursor -= 1;
  var frame = undoStuff.buffer[undoStuff.cursor];
  frame.forEach(function(change) {
    applyChange(change, false);
  });
  previousState = JSON.parse(JSON.stringify(level));
  undoStuffChanged(undoStuff);
}
function redo(undoStuff) {
  // re-move. redo an unmove.
  if (undoStuff.cursor === undoStuff.buffer.length) return; // nothing to redo
  var frame = undoStuff.buffer[undoStuff.cursor];
  undoStuff.cursor += 1;
  frame.forEach(function(change) {
    applyChange(change, true);
  });
  previousState = JSON.parse(JSON.stringify(level));
  undoStuffChanged(undoStuff);
}
function applyChange(change, isForwards) {
  if (change[0] === "m") {
    var fromTileCode = change[1].charCodeAt(0) - "0".charCodeAt(0);
    var   toTileCode = change[2].charCodeAt(0) - "0".charCodeAt(0);
    var location = parseInt(change.substr(3), 10);
    if (!isForwards) {
      var tmp = toTileCode;
      toTileCode = fromTileCode;
      fromTileCode = tmp;
    }
    if (level.map[location] !== fromTileCode) return; // conflict
    level.map[location] = toTileCode;
  } else if (change[0] === "s" || change[0] === "b") {
    var type = change[0];
    var color = change[1].charCodeAt(0) - "0".charCodeAt(0);
    var dividerIndex = change.indexOf("]", 4) + 1;
    var fromDead = change[2]            !== "0";
    var   toDead = change[dividerIndex] !== "0";
    var fromLocations = JSON.parse(change.substring(3, dividerIndex));
    var   toLocations = JSON.parse(change.substring(dividerIndex + 1));
    if (!isForwards) {
      var tmp = toLocations;
      toLocations = fromLocations;
      fromLocations = tmp;
      tmp = toDead;
      toDead = fromDead;
      fromDead = tmp;
    }
    var object = findObjectOfTypeAndColor(type, color);
    if (fromLocations.length !== 0) {
      // should exist at this location
      if (object == null) return; // conflict
      if (!deepEquals(object.locations, fromLocations)) return; // conflict
      if (object.dead !== fromDead) return; // conflict
      // doit
      if (toLocations.length !== 0) {
        object.locations = toLocations;
        object.dead = toDead;
      } else {
        removeObject(object);
      }
    } else {
      // shouldn't exist
      if (object != null) return; // conflict
      // doit
      object = {
        type: type,
        color: color,
        dead: toDead,
        locations: toLocations,
      };
      level.objects.push(object);
    }
  } else throw asdf;
}

function reset(undoStuff) {
  throw asdf; // TODO
  undoStuff.cursor = 1;
  level = JSON.parse(undoStuff.buffer[undoStuff.cursor - 1]);
  undoStuffChanged(undoStuff);
}

function undoStuffChanged(undoStuff) {
  var redoCount = undoStuff.buffer.length - undoStuff.cursor;
  var movesText = undoStuff.cursor + "+" + redoCount;
  document.getElementById(undoStuff.spanId).textContent = movesText;
  document.getElementById(undoStuff.redoButtonId).disabled = redoCount === 0;
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
  document.getElementById("wasdSpan").textContent = persistentState.showEditor ? "" : "/WASD";

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
    if (newTile === FRUIT) {
      // eat
      level.map[newLocation] = SPACE;
      ate = true;
    } else if (isTileCodeAir(newTile)) {
      var otherObject = findObjectAtLocation(newLocation);
      if (otherObject != null) {
        if (otherObject === activeSnake) return; // can't push yourself
        // push objects
        if (!pushOrFallOrSomething(activeSnake, otherObject, dr, dc, pushedObjects)) return false;
      }
    } else return; // can't go through that tile
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
    if (!isUneatenFruit()) {
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
        if (object.type === "s") {
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
  }

  pushUndo(unmoveStuff);
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
          if (deadObject.type === "s") {
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
  if (object.type === "s" && object.color === activeSnakeColor) {
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
  return findObjectOfTypeAndColor("b", color);
}
function findSnakeOfColor(color) {
  return findObjectOfTypeAndColor("s", color);
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
function isUneatenFruit() {
  for (var i = 0; i < level.map.length; i++) {
    if (level.map[i] === FRUIT) return true;
  }
  return false;
}
function countSnakes() {
  return getSnakes().length;
}
function getSnakes() {
  return getObjectsOfType("s");
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
    if (paintBrushTileCode === "b") {
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
  var serialization = stringifyLevel(level);
  document.getElementById("serializationTextarea").value = serialization;
  var link = location.href.substr(0, location.href.length - location.hash.length);
  link += "#level=" + serialization.replace(/\s+/g, "");
  document.getElementById("shareLinkTextbox").value = link;

  return; // this is the end of the function proper

  function renderLevel(onlyTheseObjects) {
    var objects = level.objects;
    if (onlyTheseObjects != null) objects = onlyTheseObjects;
    // begin by rendering the background connections for blocks
    objects.forEach(function(object) {
      if (object.type !== "b") return;
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
      } else if (paintBrushTileCode === "s") {
        if (!(objectHere != null && objectHere.type === "s" && objectHere.color === paintBrushSnakeColorIndex)) {
          drawObject(newSnake(paintBrushSnakeColorIndex, hoverLocation));
        }
      } else if (paintBrushTileCode === "b") {
        if (!(objectHere != null && objectHere.type === "b" && objectHere.color === paintBrushBlockColorIndex)) {
          drawObject(newBlock(paintBrushSnakeColorIndex, hoverLocation));
        }
      } else if (paintBrushTileCode === "resize") {
        void 0; // do nothing
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
      case FRUIT:
        drawCircle(r, c, "#f0f");
        break;
      case EXIT:
        var radiusFactor = isUneatenFruit() ? 0.7 : 1.2;
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
      case "s":
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
      case "b":
        var color = blockColors[object.color].foreground;
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          drawRect(rowcol.r, rowcol.c, color);
        });
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

function previewPaste(hoverR, hoverC) {
  var offsetR = hoverR - clipboardOffsetRowcol.r;
  var offsetC = hoverC - clipboardOffsetRowcol.c;

  var newLevel = JSON.parse(JSON.stringify(level));
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
        if (object.type === "s") {
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

window.addEventListener("hashchange", function() {
  loadFromLocationHash();
});
function loadFromLocationHash() {
  if (location.hash.indexOf("#level=") !== 0) return false;
  try {
    var level = parseLevel(location.hash.substring("#level=".length));
  } catch (e) {
    alert(e);
    return false;
  }
  loadLevel(level);
  return true;
}

loadPersistentState();
if (!loadFromLocationHash()) {
  loadLevel(parseLevel(exampleLevel));
}
