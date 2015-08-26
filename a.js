var canvas = document.getElementById("canvas");

var SPACE = 0;
var WALL = 1;
var SPIKE = 2;
var FRUIT = 3;
var EXIT = 4;
var PORTAL = 5;
var validTileCodes = [SPACE, WALL, SPIKE, FRUIT, EXIT, PORTAL];

var tileSize = 30;
var level;
var unmoveStuff = {undoStack:[], redoStack:[], spanId:"movesSpan", undoButtonId:"unmoveButton", redoButtonId:"removeButton"};
var uneditStuff = {undoStack:[], redoStack:[], spanId:"editsSpan", undoButtonId:"uneditButton", redoButtonId:"reeditButton"};
var paradoxes = [];
function loadLevel(newLevel) {
  level = newLevel;

  activateAnySnakePlease();
  unmoveStuff.undoStack = [];
  unmoveStuff.redoStack = [];
  undoStuffChanged(unmoveStuff);
  uneditStuff.undoStack = [];
  uneditStuff.redoStack = [];
  undoStuffChanged(uneditStuff);
  render();
}


var magicNumber = "3tFRIoTU";
var exampleLevel = magicNumber + "&" +
  "17&31" +
  "?" +
    "0000000000000000000000000000000" +
    "0000000000000000000000000000000" +
    "0000000000000000000000000000000" +
    "0000000000000000000000000000000" +
    "0000000000000000000000000000000" +
    "0000000000000000000000000000000" +
    "0000000000000000000040000000000" +
    "0000000000000110000000000000000" +
    "0000000000000111100000000000000" +
    "0000000000000011000000000000000" +
    "0000000000000010003010000000000" +
    "0000000000000010100011000300000" +
    "0000001111111000110000000110000" +
    "0000011111111111111111111110000" +
    "0000011111111101111111111100000" +
    "0000001111111100111111111100000" +
    "0000001111111000111111111100000" +
  "/" +
  "s0 ?351&350&349/";

function parseLevel(string) {
  // magic number
  var cursor = 0;
  skipWhitespace();
  if (string.indexOf(magicNumber) !== 0) throw new Error("not a snakefall level");
  cursor += magicNumber.length;
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
  mapData = decompressSerialization(mapData);
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
    if (colorArray[object.color % colorArray.length] == null) throw parserError("invalid color index");

    // locations
    var locationsData = readRun();
    var locationStrings = locationsData.split("&");
    if (locationStrings.length === 0) throw parserError("locations must be non-empty");
    locationStrings.forEach(function(locationString) {
      var location = parseInt(locationString);
      if (!(0 <= location && location < level.map.length)) throw parserError("location out of bounds: " + JSON.stringify(locationString));
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
function serializeObjectState(object) {
  if (object == null) return [0,[]];
  return [object.dead, copyArray(object.locations)];
}

var base66 = "----0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function compressSerialization(string) {
  string = string.replace(/\s+/g, "");
  // run-length encode several 0's in a row, etc.
  // 2000000000000003 -> 2*A03 ("A" is 14 in base66 defined above)
  var result = "";
  var runStart = 0;
  for (var i = 1; i < string.length + 1; i++) {
    var runLength = i - runStart;
    if (string[i] === string[runStart] && runLength < base66.length - 1) continue;
    // end of run
    if (runLength >= 4) {
      // compress
      result += "*" + base66[runLength] + string[runStart];
    } else {
      // literal
      result += string.substring(runStart, i);
    }
    runStart = i;
  }
  return result;
}
function decompressSerialization(string) {
  string = string.replace(/\s+/g, "");
  var result = "";
  for (var i = 0; i < string.length; i++) {
    if (string[i] === "*") {
      i += 1;
      var runLength = base66.indexOf(string[i]);
      i += 1;
      var char = string[i];
      for (var j = 0; j < runLength; j++) {
        result += char;
      }
    } else {
      result += string[i];
    }
  }
  return result;
}

function saveToUrlBar() {
  location.hash = "#level=" + compressSerialization(stringifyLevel(level));
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
      if ( persistentState.showEditor && modifierMask === SHIFT) { setPaintBrushTileCode("select"); break; }
      return;

    case "P".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === 0) { playtest(); break; }
      return;
    case 220: // backslash
      if (modifierMask === 0) { toggleShowEditor(); break; }
      return;
    case "A".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0)    { move(0, -1); break; }
      if ( persistentState.showEditor && modifierMask === 0)    { setPaintBrushTileCode(PORTAL); break; }
      if ( persistentState.showEditor && modifierMask === CTRL) { selectAll(); break; }
      return;
    case "E".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(SPACE); break; }
      return;
    case 46: // delete
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(SPACE); break; }
      return;
    case "W".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(-1, 0); break; }
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(WALL); break; }
      return;
    case "S".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0)     { move(1, 0); break; }
      if ( persistentState.showEditor && modifierMask === 0)     { setPaintBrushTileCode(SPIKE); break; }
      if ( persistentState.showEditor && modifierMask === SHIFT) { setPaintBrushTileCode("resize"); break; }
      if ( persistentState.showEditor && modifierMask === CTRL)  { saveToUrlBar(); break; }
      return;
    case "X".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(EXIT); break; }
      if ( persistentState.showEditor && modifierMask === CTRL) { cutSelection(); break; }
      return;
    case "F".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(FRUIT); break; }
      return;
    case "D".charCodeAt(0):
      if (!persistentState.showEditor && modifierMask === 0) { move(0, 1); break; }
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode("s"); break; }
      return;
    case "B".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode("b"); break; }
      return;
    case "G".charCodeAt(0):
      if (modifierMask === 0) { toggleGrid(); break; }
      if ( persistentState.showEditor && modifierMask === SHIFT) { toggleGravity(); break; }
      return;
    case "C".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === SHIFT) { toggleCollision(); break; }
      if ( persistentState.showEditor && modifierMask === CTRL)  { copySelection();   break; }
      return;
    case "V".charCodeAt(0):
      if ( persistentState.showEditor && modifierMask === CTRL) { setPaintBrushTileCode("paste"); break; }
      return;
    case 32: // spacebar
    case 9:  // tab
      if (modifierMask === 0)     { switchSnakes( 1); break; }
      if (modifierMask === SHIFT) { switchSnakes(-1); break; }
      return;
    case "1".charCodeAt(0):
    case "2".charCodeAt(0):
    case "3".charCodeAt(0):
    case "4".charCodeAt(0):
      var index = event.keyCode - "1".charCodeAt(0);
      var delta;
      if (modifierMask === 0) {
        delta = 1;
      } else if (modifierMask === SHIFT) {
        delta = -1;
      } else return;
      if (isAlive()) {
        (function() {
          var snakes = findSnakesOfColor(index);
          if (snakes.length === 0) return;
          for (var i = 0; i < snakes.length; i++) {
            if (snakes[i].color === activeSnakeColor) {
              activeSnakeColor = snakes[(i + delta + snakes.length) % snakes.length].color;
              return;
            }
          }
          activeSnakeColor = snakes[0].color;
        })();
      }
      break;
    case 27: // escape
      if ( persistentState.showEditor && modifierMask === 0) { setPaintBrushTileCode(null); break; }
      return;
    default: return;
  }
  event.preventDefault();
  render();
});

document.getElementById("switchSnakesButton").addEventListener("click", function() {
  switchSnakes(1);
  render();
});
function switchSnakes(delta) {
  if (!isAlive()) return;
  var snakes = getSnakes();
  snakes.sort(compareColor);
  for (var i = 0; i < snakes.length; i++) {
    if (snakes[i].color === activeSnakeColor) {
      activeSnakeColor = snakes[(i + delta + snakes.length) % snakes.length].color;
      return;
    }
  }
  activeSnakeColor = snakes[0].color;
}
document.getElementById("showGridButton").addEventListener("click", function() {
  toggleGrid();
});
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
function toggleGrid() {
  persistentState.showGrid = !persistentState.showGrid;
  savePersistentState();
  render();
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
  ["paintPortalButton", PORTAL],
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
document.getElementById("saveButton").addEventListener("click", function() {
  saveToUrlBar();
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
var draggingChangeLog = null;
canvas.addEventListener("mousedown", function(event) {
  if (event.altKey) return;
  if (event.button !== 0) return;
  event.preventDefault();
  var location = getLocationFromEvent(event);
  if (persistentState.showEditor && paintBrushTileCode != null) {
    // editor tool
    lastDraggingRowcol = getRowcol(level, location);
    if (paintBrushTileCode === "select") selectionStart = location;
    if (paintBrushTileCode === "resize") resizeDragAnchorRowcol = lastDraggingRowcol;
    draggingChangeLog = [];
    paintAtLocation(location, draggingChangeLog);
  } else {
    // playtime
    var object = findObjectAtLocation(location);
    if (object == null) return;
    if (object.type !== "s") return;
    // active snake
    activeSnakeColor = object.color;
    render();
  }
});
canvas.addEventListener("dblclick", function(event) {
  if (event.altKey) return;
  if (event.button !== 0) return;
  event.preventDefault();
  if (persistentState.showEditor && paintBrushTileCode === "select") {
    // double click with select tool
    var location = getLocationFromEvent(event);
    var object = findObjectAtLocation(location);
    if (object == null) return;
    stopDragging();
    if (object.type === "s") {
      // edit snakes of this color
      paintBrushTileCode = "s";
      paintBrushSnakeColorIndex = object.color % snakeColors.length;
    } else if (object.type === "b") {
      // edit this particular block
      paintBrushTileCode = "b";
      paintBrushBlockColorIndex = object.color;
    } else throw asdf;
    paintBrushTileCodeChanged();
  }
});
document.addEventListener("mouseup", function(event) {
  stopDragging();
});
function stopDragging() {
  if (lastDraggingRowcol != null) {
    // release the draggin'
    lastDraggingRowcol = null;
    paintBrushObject = null;
    resizeDragAnchorRowcol = null;
    pushUndo(uneditStuff, draggingChangeLog);
    draggingChangeLog = null;
  }
}
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
      paintAtLocation(getLocation(level, rowcol.r, rowcol.c), draggingChangeLog);
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
    if (typeof tileCode === "number" && !(tileCode === EXIT || tileCode === PORTAL)) {
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
  var changeLog = [];
  var locations = getSelectedLocations();
  locations.forEach(function(location) {
    if (level.map[location] !== tileCode) {
      changeLog.push(["m", location, level.map[location], tileCode]);
      level.map[location] = tileCode;
    }
    removeAnyObjectAtLocation(location, changeLog);
  });
  pushUndo(uneditStuff, changeLog);
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

function setHeight(newHeight, changeLog) {
  if (newHeight < level.height) {
    // crop
    for (var r = newHeight; r < level.height; r++) {
      for (var c = 0; c < level.width; c++) {
        var location = getLocation(level, r, c);
        removeAnyObjectAtLocation(location, changeLog);
        // also delete non-space tiles
        paintTileAtLocation(location, SPACE, changeLog);
      }
    }
    level.map.splice(newHeight * level.width);
  } else {
    // expand
    for (var r = level.height; r < newHeight; r++) {
      for (var c = 0; c < level.width; c++) {
        level.map.push(SPACE);
      }
    }
  }
  changeLog.push(["h", level.height, newHeight]);
  level.height = newHeight;
}
function setWidth(newWidth, changeLog) {
  if (newWidth < level.width) {
    // crop
    for (var r = level.height - 1; r >= 0; r--) {
      for (var c = level.width - 1; c >= newWidth; c--) {
        var location = getLocation(level, r, c);
        removeAnyObjectAtLocation(location, changeLog);
        paintTileAtLocation(location, SPACE, changeLog);
        level.map.splice(location, 1);
      }
    }
  } else {
    // expand
    for (var r = level.height - 1; r >= 0; r--) {
      var insertionPoint = level.width * (r + 1);
      for (var c = level.width; c < newWidth; c++) {
        // boy is this inefficient. ... YOLO!
        level.map.splice(insertionPoint, 0, SPACE);
      }
    }
  }

  var transformLocation = makeScaleCoordinatesFunction(level.width, newWidth);
  level.objects.forEach(function(object) {
    object.locations = object.locations.map(transformLocation);
  });

  changeLog.push(["w", level.width, newWidth]);
  level.width = newWidth;
}

function newSnake(color, location) {
  var snakes = findSnakesOfColor(color);
  snakes.sort(compareColor);
  for (var i = 0; i < snakes.length; i++) {
    if (snakes[i].color !== i * snakeColors.length + color) break;
  }
  return {
    type: "s",
    color: i * snakeColors.length + color,
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
function paintAtLocation(location, changeLog) {
  if (typeof paintBrushTileCode === "number") {
    removeAnyObjectAtLocation(location, changeLog);
    paintTileAtLocation(location, paintBrushTileCode, changeLog);
  } else if (paintBrushTileCode === "resize") {
    var toRowcol = getRowcol(level, location);
    var dr = toRowcol.r - resizeDragAnchorRowcol.r;
    var dc = toRowcol.c - resizeDragAnchorRowcol.c;
    resizeDragAnchorRowcol = toRowcol;
    if (dr !== 0) setHeight(level.height + dr, changeLog);
    if (dc !== 0) setWidth(level.width + dc, changeLog);
  } else if (paintBrushTileCode === "select") {
    selectionEnd = location;
  } else if (paintBrushTileCode === "paste") {
    var hoverRowcol = getRowcol(level, location);
    var pastedData = previewPaste(hoverRowcol.r, hoverRowcol.c);
    pastedData.selectedLocations.forEach(function(location) {
      var tileCode = pastedData.level.map[location];
      removeAnyObjectAtLocation(location, changeLog);
      paintTileAtLocation(location, tileCode, changeLog);
    });
    pastedData.selectedObjects.forEach(function(object) {
      // delete and recreate. could probably be just a move i guess. idk.
      var otherObject = findObjectOfTypeAndColor(object.type, object.color);
      if (otherObject != null) removeObject(otherObject, changeLog);
      level.objects.push(object);
      changeLog.push([object.type, object.color, [0,[]], serializeObjectState(object)]);
    });
  } else if (paintBrushTileCode === "s") {
    var oldSnakeSerialization = serializeObjectState(paintBrushObject);
    if (paintBrushObject != null) {
      // keep dragging
      if (paintBrushObject.locations[0] === location) return; // we just did that
      // watch out for self-intersection
      var selfIntersectionIndex = paintBrushObject.locations.indexOf(location);
      if (selfIntersectionIndex !== -1) {
        // truncate from here back
        paintBrushObject.locations.splice(selfIntersectionIndex);
      }
    }

    // make sure there's space behind us
    paintTileAtLocation(location, SPACE, changeLog);
    removeAnyObjectAtLocation(location, changeLog);
    if (paintBrushObject == null) {
      var thereWereNoSnakes = countSnakes() === 0;
      paintBrushObject = newSnake(paintBrushSnakeColorIndex, location);
      level.objects.push(paintBrushObject);
      if (thereWereNoSnakes) activateAnySnakePlease();
    } else {
      // extend le snake
      paintBrushObject.locations.unshift(location);
    }
    changeLog.push([paintBrushObject.type, paintBrushObject.color, oldSnakeSerialization, serializeObjectState(paintBrushObject)]);
  } else if (paintBrushTileCode === "b") {
    // make sure there's space behind us
    paintTileAtLocation(location, SPACE, changeLog);
    removeAnyObjectAtLocation(location, changeLog);
    var thisBlock = findBlockOfColor(paintBrushBlockColorIndex);
    var oldBlockSerialization = serializeObjectState(thisBlock);
    if (thisBlock == null) {
      thisBlock = newBlock(paintBrushBlockColorIndex, location);
      level.objects.push(thisBlock);
    } else {
      var existingIndex = thisBlock.locations.indexOf(location);
      if (existingIndex !== -1) {
        // reclicking part of this object means to delete just part of it.
        if (thisBlock.locations.length === 1) {
          removeObject(thisBlock, changeLog);
        } else {
          thisBlock.locations.splice(existingIndex, 1);
        }
      } else {
        // add a tile to the block
        thisBlock.locations.push(location);
      }
    }
    changeLog.push([thisBlock.type, thisBlock.color, oldBlockSerialization, serializeObjectState(thisBlock)]);
  } else throw asdf;
  render();
}

function paintTileAtLocation(location, tileCode, changeLog) {
  if (level.map[location] === tileCode) return;
  if (tileCode === EXIT) {
    // delete any other exits
    for (var i = 0; i < level.map.length; i++) {
      if (level.map[i] === EXIT) {
        changeLog.push(["m", i, level.map[i], SPACE]);
        level.map[i] = SPACE;
      }
    }
  }
  changeLog.push(["m", location, level.map[location], tileCode]);
  level.map[location] = tileCode;
}

function playtest() {
  unmoveStuff.undoStack = [];
  unmoveStuff.redoStack = [];
  undoStuffChanged(unmoveStuff);
}

function pushUndo(undoStuff, changeLog) {
  // changeLog = [
  //   ["m", 21, 0, 1],                              // map at location 23 changed from 0 to 1
  //   ["s", 0, [false, [1,2]], [false, [2,3]]],     // snake color 0 moved from alive at [1, 2] to alive at [2, 3]
  //   ["s", 1, [false, [11,12]], [true, [12,13]]],  // snake color 1 moved from alive at [11, 12] to dead at [12, 13]
  //   ["b", 1, [false, [20,30]], [false, []]],      // block color 1 was deleted from location [20, 30]
  //   ["h", 25, 10],                                // height changed from 25 to 10. all cropped tiles are guaranteed to be SPACE.
  //   ["w", 8, 10],                                 // width changed from 8 to 10. a change in the coordinate system.
  //   ["m", 23, 2, 0],                              // map at location 23 changed from 2 to 0 in the new coordinate system.
  //   10,                                           // the last change is always a declaration of the final width of the map.
  // ];
  reduceChangeLog(changeLog);
  if (changeLog.length === 0) return;
  changeLog.push(level.width);
  undoStuff.undoStack.push(changeLog);
  undoStuff.redoStack = [];
  paradoxes = [];
  undoStuffChanged(undoStuff);
}
function reduceChangeLog(changeLog) {
  for (var i = 0; i < changeLog.length - 1; i++) {
    var change = changeLog[i];
    if (change[0] === "h") {
      for (var j = i + 1; j < changeLog.length; j++) {
        var otherChange = changeLog[j];
        if (otherChange[0] === "h") {
          // combine
          change[2] = otherChange[2];
          changeLog.splice(j, 1);
          j--;
          continue;
        } else if (otherChange[0] === "w") {
          continue; // no interaction between height and width
        } else break; // no more reduction possible
      }
      if (change[1] === change[2]) {
        // no change
        changeLog.splice(i, 1);
        i--;
      }
    } else if (change[0] === "w") {
      for (var j = i + 1; j < changeLog.length; j++) {
        var otherChange = changeLog[j];
        if (otherChange[0] === "w") {
          // combine
          change[2] = otherChange[2];
          changeLog.splice(j, 1);
          j--;
          continue;
        } else if (otherChange[0] === "h") {
          continue; // no interaction between height and width
        } else break; // no more reduction possible
      }
      if (change[1] === change[2]) {
        // no change
        changeLog.splice(i, 1);
        i--;
      }
    } else if (change[0] === "m") {
      for (var j = i + 1; j < changeLog.length; j++) {
        var otherChange = changeLog[j];
        if (otherChange[0] === "m" && otherChange[1] === change[1]) {
          // combine
          change[3] = otherChange[3];
          changeLog.splice(j, 1);
          j--;
        } else if (otherChange[0] === "w" || otherChange[0] === "h") {
          break; // can't reduce accros resizes
        }
      }
      if (change[2] === change[3]) {
        // no change
        changeLog.splice(i, 1);
        i--;
      }
    } else if (change[0] === "s" || change[0] === "b") {
      for (var j = i + 1; j < changeLog.length; j++) {
        var otherChange = changeLog[j];
        if (otherChange[0] === change[0] && otherChange[1] === change[1]) {
          // combine
          change[3] = otherChange[3];
          changeLog.splice(j, 1);
          j--;
        } else if (otherChange[0] === "w" || otherChange[0] === "h") {
          break; // can't reduce accros resizes
        }
      }
      if (deepEquals(change[2], change[3])) {
        // no change
        changeLog.splice(i, 1);
        i--;
      }
    } else throw asdf;
  }
}
function undo(undoStuff) {
  if (undoStuff.undoStack.length === 0) return; // already at the beginning
  paradoxes = [];
  undoOneFrame(undoStuff);
  undoStuffChanged(undoStuff);
}
function reset(undoStuff) {
  paradoxes = [];
  while (undoStuff.undoStack.length > 0) {
    undoOneFrame(undoStuff);
  }
  undoStuffChanged(undoStuff);
}
function undoOneFrame(undoStuff) {
  var doThis = undoStuff.undoStack.pop();
  var redoChangeLog = [];
  undoChanges(doThis, redoChangeLog);
  if (redoChangeLog.length > 0) {
    redoChangeLog.push(level.width);
    undoStuff.redoStack.push(redoChangeLog);
  }
}
function redo(undoStuff) {
  if (undoStuff.redoStack.length === 0) return; // already at the beginning
  paradoxes = [];
  var doThis = undoStuff.redoStack.pop();
  var undoChangeLog = [];
  undoChanges(doThis, undoChangeLog);
  if (undoChangeLog.length > 0) {
    undoChangeLog.push(level.width);
    undoStuff.undoStack.push(undoChangeLog);
  }
  undoStuffChanged(undoStuff);
}
function undoChanges(changes, changeLog) {
  var widthContext = changes.pop();
  var transformLocation = widthContext === level.width ? identityFunction : makeScaleCoordinatesFunction(widthContext, level.width);
  for (var i = changes.length - 1; i >= 0; i--) {
    var paradoxDescription = undoChange(changes[i]);
    if (paradoxDescription != null) paradoxes.push(paradoxDescription);
  }

  function undoChange(change) {
    // note: everything here is going backwards: to -> from
    if (change[0] === "h") {
      // change height
      var fromHeight = change[1];
      var   toHeight = change[2];
      if (level.height !== toHeight) return "Impossible";
      setHeight(fromHeight, changeLog);
    } else if (change[0] === "w") {
      // change width
      var fromWidth = change[1];
      var   toWidth = change[2];
      if (level.width !== toWidth) return "Impossible";
      setWidth(fromWidth, changeLog);
    } else if (change[0] === "m") {
      // change map tile
      var location = transformLocation(change[1]);
      var fromTileCode = change[2];
      var   toTileCode = change[3];
      if (location >= level.map.length) return "Can't turn " + describe(toTileCode) + " into " + describe(fromTileCode) + " out of bounds";
      if (level.map[location] !== toTileCode) return "Can't turn " + describe(toTileCode) + " into " + describe(fromTileCode) + " because there's " + describe(level.map[location]) + " there now";
      paintTileAtLocation(location, fromTileCode, changeLog);
    } else if (change[0] === "s" || change[0] === "b") {
      // change object
      var type = change[0];
      var color = change[1];
      var fromDead = change[2][0];
      var   toDead = change[3][0];
      var fromLocations = change[2][1].map(transformLocation);
      var   toLocations = change[3][1].map(transformLocation);
      if (fromLocations.filter(function(location) { return location >= level.map.length; }).length > 0) {
        return "Can't move " + describe(type, color) + " out of bounds";
      }
      var object = findObjectOfTypeAndColor(type, color);
      if (toLocations.length !== 0) {
        // should exist at this location
        if (object == null) return "Can't move " + describe(type, color) + " because it doesn't exit";
        if (!deepEquals(object.locations, toLocations)) return "Can't move " + describe(object) + " because it's in the wrong place";
        if (object.dead !== toDead) return "Can't move " + describe(object) + " because it's alive/dead state doesn't match";
        // doit
        if (fromLocations.length !== 0) {
          var oldState = serializeObjectState(object);
          object.locations = fromLocations;
          object.dead = fromDead;
          changeLog.push([object.type, object.color, oldState, serializeObjectState(object)]);
        } else {
          removeObject(object, changeLog);
        }
      } else {
        // shouldn't exist
        if (object != null) return "Can't create " + describe(type, color) + " because it already exists";
        // doit
        object = {
          type: type,
          color: color,
          dead: fromDead,
          locations: fromLocations,
        };
        level.objects.push(object);
        changeLog.push([object.type, object.color, [0,[]], serializeObjectState(object)]);
      }
    } else throw asdf;
  }
}
function describe(arg1, arg2) {
  // describe(0) -> "Space"
  // describe("s", 0) -> "Snake 0 (Red)"
  // describe(object) -> "Snake 0 (Red)"
  // describe("b", 1) -> "Block 1"
  if (typeof arg1 === "number") {
    switch (arg1) {
      case SPACE: return "Space";
      case WALL:  return "a Wall";
      case SPIKE: return "Spikes";
      case FRUIT: return "Fruit";
      case EXIT:  return "the Exit";
      case PORTAL:  return "a Portal";
      default: throw asdf;
    }
  }
  if (arg1 === "s") {
    var color = (function() {
      switch (snakeColors[arg2]) {
        case "#f00": return " (Red)";
        case "#0f0": return " (Green)";
        case "#00f": return " (Blue)";
        case "#ff0": return " (Yellow)";
        default: throw asdf;
      }
    })();
    return "Snake " + arg2 + color;
  }
  if (arg1 === "b") {
    return "Block " + arg2;
  }
  if (typeof arg1 === "object") return describe(arg1.type, arg1.color);
  throw asdf;
}

function undoStuffChanged(undoStuff) {
  var movesText = undoStuff.undoStack.length + "+" + undoStuff.redoStack.length;
  document.getElementById(undoStuff.spanId).textContent = movesText;
  document.getElementById(undoStuff.undoButtonId).disabled = undoStuff.undoStack.length === 0;
  document.getElementById(undoStuff.redoButtonId).disabled = undoStuff.redoStack.length === 0;

  // render paradox display
  var uniqueParadoxes = [];
  var paradoxCounts = [];
  paradoxes.forEach(function(paradoxDescription) {
    var index = uniqueParadoxes.indexOf(paradoxDescription);
    if (index !== -1) {
      paradoxCounts[index] += 1;
    } else {
      uniqueParadoxes.push(paradoxDescription);
      paradoxCounts.push(1);
    }
  });
  var paradoxDivContent = "";
  uniqueParadoxes.forEach(function(paradox, i) {
    if (i > 0) paradoxDivContent += "<br>\n";
    if (paradoxCounts[i] > 1) paradoxDivContent += "(" + paradoxCounts[i] + "x) ";
    paradoxDivContent += "Time Travel Paradox! " + uniqueParadoxes[i];
  });
  document.getElementById("paradoxDiv").innerHTML = paradoxDivContent;
}

var persistentState = {
  showEditor: false,
  showGrid: false,
};
function savePersistentState() {
  localStorage.snakefall = JSON.stringify(persistentState);
}
function loadPersistentState() {
  try {
    persistentState = JSON.parse(localStorage.snakefall);
  } catch (e) {
  }
  persistentState.showEditor = !!persistentState.showEditor;
  persistentState.showGrid = !!persistentState.showGrid;
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
  var changeLog = [];
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
      paintTileAtLocation(newLocation, SPACE, changeLog);
      ate = true;
    } else if (isTileCodeAir(newTile)) {
      var otherObject = findObjectAtLocation(newLocation);
      if (otherObject != null) {
        if (otherObject === activeSnake) return; // can't push yourself
        // push objects
        if (!checkMovement(activeSnake, otherObject, dr, dc, pushedObjects)) return false;
      }
    } else return; // can't go through that tile
  }

  // slither forward
  var activeSnakeOldState = serializeObjectState(activeSnake);
  activeSnake.locations.unshift(newLocation);
  if (!ate) {
    activeSnake.locations.pop();
  }
  changeLog.push([activeSnake.type, activeSnake.color, activeSnakeOldState, serializeObjectState(activeSnake)]);
  // did you just push your face into a portal?
  var portalLocations = getActivePortalLocations();
  if (portalLocations.indexOf(newLocation) !== -1) {
    activatePortal(portalLocations, newLocation, changeLog);
  }
  // push everything, too
  moveObjects(pushedObjects, dr, dc, portalLocations, changeLog);

  // gravity loop
  while (isGravity()) {
    var didAnything = false;

    // check for exit
    if (!isUneatenFruit()) {
      var snakes = getSnakes();
      for (var i = 0; i < snakes.length; i++) {
        if (level.map[snakes[i].locations[0]] === EXIT) {
          // (one of) you made it!
          removeObject(snakes[i], changeLog);
          didAnything = true;
        }
      }
    }

    // fall
    var dyingObjects = [];
    var fallingObjects = level.objects.filter(function(object) {
      var theseDyingObjects = [];
      if (!checkMovement(null, object, 1, 0, [], theseDyingObjects)) return false;
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
          var oldState = serializeObjectState(object);
          object.dead = true;
          changeLog.push([object.type, object.color, oldState, serializeObjectState(object)]);
          anySnakesDied = true;
        } else {
          // a box fell off the world
          removeObject(object, changeLog);
          removeFromArray(fallingObjects, object);
        }
      });
      if (anySnakesDied) break;
    }
    if (fallingObjects.length > 0) {
      moveObjects(fallingObjects, 1, 0, portalLocations, changeLog);
      didAnything = true;
    }

    if (!didAnything) break;
  }

  pushUndo(unmoveStuff, changeLog);
  render();
}

function checkMovement(pusher, pushedObject, dr, dc, pushedObjects, dyingObjects) {
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

function moveObjects(objects, dr, dc, portalLocations, changeLog) {
  objects.forEach(function(object) {
    var oldState = serializeObjectState(object);
    var oldPortals = getSetIntersection(portalLocations, object.locations);
    for (var i = 0; i < object.locations.length; i++) {
      object.locations[i] = offsetLocation(object.locations[i], dr, dc);
    }
    changeLog.push([object.type, object.color, oldState, serializeObjectState(object)]);

    var newPortals = getSetIntersection(portalLocations, object.locations);
    var activatingPortals = newPortals.filter(function(portalLocation) {
      return oldPortals.indexOf(portalLocation) === -1;
    });
    if (activatingPortals.length === 1) {
      // exactly one new portal we're touching. activate it
      activatePortal(portalLocations, activatingPortals[0], changeLog);
    }
  });
}

function activatePortal(portalLocations, portalLocation, changeLog) {
  var otherPortalLocation = portalLocations[1 - portalLocations.indexOf(portalLocation)];
  var portalRowcol = getRowcol(level, portalLocation);
  var otherPortalRowcol = getRowcol(level, otherPortalLocation);
  var delta = {r:otherPortalRowcol.r - portalRowcol.r, c:otherPortalRowcol.c - portalRowcol.c};

  var object = findObjectAtLocation(portalLocation);
  var newLocations = [];
  for (var i = 0; i < object.locations.length; i++) {
    var rowcol = getRowcol(level, object.locations[i]);
    var r = rowcol.r + delta.r;
    var c = rowcol.c + delta.c;
    if (!isInBounds(level, r, c)) return; // out of bounds
    newLocations.push(getLocation(level, r, c));
  }

  for (var i = 0; i < newLocations.length; i++) {
    var location = newLocations[i];
    if (!isTileCodeAir(level.map[location])) return; // blocked by tile
    var otherObject = findObjectAtLocation(location);
    if (otherObject != null && otherObject !== object) return; // blocked by object
  }

  // zappo presto!
  var oldState = serializeObjectState(object);
  object.locations = newLocations;
  changeLog.push([object.type, object.color, oldState, serializeObjectState(object)]);
}

function isTileCodeAir(tileCode) {
  return tileCode === SPACE || tileCode === EXIT || tileCode === PORTAL;
}

function addIfNotPresent(array, element) {
  if (array.indexOf(element) !== -1) return;
  array.push(element);
}
function removeAnyObjectAtLocation(location, changeLog) {
  var object = findObjectAtLocation(location);
  if (object != null) removeObject(object, changeLog);
}
function removeObject(object, changeLog) {
  removeFromArray(level.objects, object);
  changeLog.push([object.type, object.color, [object.dead, copyArray(object.locations)], [0,[]]]);
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
function findSnakesOfColor(color) {
  return level.objects.filter(function(object) {
    if (object.type !== "s") return false;
    return object.color % snakeColors.length === color;
  });
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
function getActivePortalLocations() {
  var portalLocations = getPortalLocations();
  if (portalLocations.length !== 2) return []; // nice try
  return portalLocations;
}
function getPortalLocations() {
  var result = [];
  for (var i = 0; i < level.map.length; i++) {
    if (level.map[i] === PORTAL) result.push(i);
  }
  return result;
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
  context.fillStyle = "#88f"; // sky
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (persistentState.showGrid && !persistentState.showEditor) {
    drawGrid();
  }

  var activePortalLocations = getActivePortalLocations();

  // normal render
  renderLevel();

  if (persistentState.showGrid && persistentState.showEditor) {
    drawGrid();
  }
  // active snake halo
  if (countSnakes() !== 0) {
    var activeSnake = findActiveSnake();
    var activeSnakeRowcol = getRowcol(level, activeSnake.locations[0]);
    drawCircle(activeSnakeRowcol.r, activeSnakeRowcol.c, 2, "rgba(256,256,256,0.3)");
  }

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
  var link = location.href.substring(0, location.href.length - location.hash.length);
  link += "#level=" + compressSerialization(serialization);
  document.getElementById("shareLinkTextbox").value = link;

  // throw this in there somewhere
  document.getElementById("showGridButton").value = (persistentState.showGrid ? "Hide" : "Show") + " Grid";

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
          var location = getLocation(level, r, c);
          var tileCode = level.map[location];
          drawTile(tileCode, r, c, level, location);
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
    if (persistentState.showEditor && paintBrushTileCode != null && hoverLocation != null && hoverLocation < level.map.length) {

      var savedContext = context;
      var buffer = document.createElement("canvas");
      buffer.width = canvas.width;
      buffer.height = canvas.height;
      context = buffer.getContext("2d");

      var hoverRowcol = getRowcol(level, hoverLocation);
      var objectHere = findObjectAtLocation(hoverLocation);
      if (typeof paintBrushTileCode === "number") {
        if (level.map[hoverLocation] !== paintBrushTileCode) {
          drawTile(paintBrushTileCode, hoverRowcol.r, hoverRowcol.c, level, hoverLocation);
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
          drawTile(tileCode, rowcol.r, rowcol.c, pastedData.level, location);
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
  function drawTile(tileCode, r, c, level, location) {
    switch (tileCode) {
      case SPACE:
        break;
      case WALL:
        drawWall(r, c, getAdjacentTiles());
        break;
      case SPIKE:
        drawSpikes(r, c, level);
        break;
      case FRUIT:
        drawCircle(r, c, 1, "#f0f");
        break;
      case EXIT:
        var radiusFactor = isUneatenFruit() ? 0.7 : 1.2;
        drawQuarterPie(r, c, radiusFactor, "#f00", 0);
        drawQuarterPie(r, c, radiusFactor, "#0f0", 1);
        drawQuarterPie(r, c, radiusFactor, "#00f", 2);
        drawQuarterPie(r, c, radiusFactor, "#ff0", 3);
        break;
      case PORTAL:
        drawCircle(r, c, 0.8, "#888");
        drawCircle(r, c, 0.6, "#111");
        if (activePortalLocations.indexOf(location) !== -1) drawCircle(r, c, 0.3, "#666");
        break;
      default: throw asdf;
    }
    function getAdjacentTiles() {
      return [
        [getTile(r - 1, c - 1),
         getTile(r - 1, c + 0),
         getTile(r - 1, c + 1)],
        [getTile(r + 0, c - 1),
         null,
         getTile(r + 0, c + 1)],
        [getTile(r + 1, c - 1),
         getTile(r + 1, c + 0),
         getTile(r + 1, c + 1)],
      ];
    }
    function getTile(r, c) {
      if (!isInBounds(level, r, c)) return null;
      return level.map[getLocation(level, r, c)];
    }
  }

  function drawObject(object) {
    switch (object.type) {
      case "s":
        var lastRowcol = null
        var color = snakeColors[object.color % snakeColors.length];
        var headRowcol;
        object.locations.forEach(function(location) {
          var rowcol = getRowcol(level, location);
          if (object.dead) rowcol.r += 0.5;
          if (lastRowcol == null) {
            // head
            headRowcol = rowcol;
            drawDiamond(rowcol.r, rowcol.c, color);
          } else {
            // tail segment
            drawCircle(rowcol.r, rowcol.c, 1, color);
            drawRect((rowcol.r + lastRowcol.r) / 2, (rowcol.c + lastRowcol.c) / 2, color);
          }
          lastRowcol = rowcol;
        });
        // eye
        if (object.color === activeSnakeColor) {
          drawCircle(headRowcol.r, headRowcol.c, 0.5, "#fff");
          drawCircle(headRowcol.r, headRowcol.c, 0.2, "#000");
        }
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

  function drawWall(r, c, adjacentTiles) {
    drawRect(r, c, "#844204"); // dirt
    context.fillStyle = "#282"; // grass
    var grassSize = 0.2;
    var complement = 1 - grassSize;
    var grassPixels = grassSize * tileSize;
    var complementPixels = (1 - 2 * grassSize) * tileSize;
    if (!isWall(-1, -1)) context.fillRect((c)            * tileSize, (r)            * tileSize, grassPixels, grassPixels);
    if (!isWall( 1, -1)) context.fillRect((c+complement) * tileSize, (r)            * tileSize, grassPixels, grassPixels);
    if (!isWall(-1,  1)) context.fillRect((c)            * tileSize, (r+complement) * tileSize, grassPixels, grassPixels);
    if (!isWall( 1,  1)) context.fillRect((c+complement) * tileSize, (r+complement) * tileSize, grassPixels, grassPixels);
    if (!isWall( 0, -1)) context.fillRect((c)            * tileSize, (r)            * tileSize, tileSize, grassPixels);
    if (!isWall( 0,  1)) context.fillRect((c)            * tileSize, (r+complement) * tileSize, tileSize, grassPixels);
    if (!isWall(-1,  0)) context.fillRect((c)            * tileSize, (r)            * tileSize, grassPixels, tileSize);
    if (!isWall( 1,  0)) context.fillRect((c+complement) * tileSize, (r)            * tileSize, grassPixels, tileSize);
    function isWall(dc, dr) {
      var tileCode = adjacentTiles[1 + dr][1 + dc];
      return tileCode == null || tileCode === WALL;
    }
  }
  function drawSpikes(r, c) {
    var x = c * tileSize;
    var y = r * tileSize;
    context.fillStyle = "#333";
    context.beginPath();
    context.moveTo(x + tileSize * 0.3, y + tileSize * 0.3);
    context.lineTo(x + tileSize * 0.4, y + tileSize * 0.0);
    context.lineTo(x + tileSize * 0.5, y + tileSize * 0.3);
    context.lineTo(x + tileSize * 0.6, y + tileSize * 0.0);
    context.lineTo(x + tileSize * 0.7, y + tileSize * 0.3);
    context.lineTo(x + tileSize * 1.0, y + tileSize * 0.4);
    context.lineTo(x + tileSize * 0.7, y + tileSize * 0.5);
    context.lineTo(x + tileSize * 1.0, y + tileSize * 0.6);
    context.lineTo(x + tileSize * 0.7, y + tileSize * 0.7);
    context.lineTo(x + tileSize * 0.6, y + tileSize * 1.0);
    context.lineTo(x + tileSize * 0.5, y + tileSize * 0.7);
    context.lineTo(x + tileSize * 0.4, y + tileSize * 1.0);
    context.lineTo(x + tileSize * 0.3, y + tileSize * 0.7);
    context.lineTo(x + tileSize * 0.0, y + tileSize * 0.6);
    context.lineTo(x + tileSize * 0.3, y + tileSize * 0.5);
    context.lineTo(x + tileSize * 0.0, y + tileSize * 0.4);
    context.lineTo(x + tileSize * 0.3, y + tileSize * 0.3);
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
  function drawCircle(r, c, radiusFactor, fillStyle) {
    context.fillStyle = fillStyle;
    context.beginPath();
    context.arc((c + 0.5) * tileSize, (r + 0.5) * tileSize, tileSize/2 * radiusFactor, 0, 2*Math.PI);
    context.fill();
  }
  function drawRect(r, c, fillStyle) {
    context.fillStyle = fillStyle;
    context.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
  }

  function drawGrid() {
    var buffer = document.createElement("canvas");
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    var localContext = buffer.getContext("2d");

    localContext.strokeStyle = "#888";
    localContext.beginPath();
    for (var r = 0; r < level.height; r++) {
      localContext.moveTo(0, tileSize*r);
      localContext.lineTo(tileSize*level.width, tileSize*r);
    }
    for (var c = 0; c < level.width; c++) {
      localContext.moveTo(tileSize*c, 0);
      localContext.lineTo(tileSize*c, tileSize*level.height);
    }
    localContext.stroke();

    context.save();
    context.globalAlpha = 0.3;
    context.drawImage(buffer, 0, 0);
    context.restore();
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
function identityFunction(x) {
  return x;
}
function compareColor(a, b) {
  return operatorCompare(a.color, b.color);
}
function operatorCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function copyArray(array) {
  return array.map(identityFunction);
}
function getSetIntersection(array1, array2) {
  if (array1.length * array2.length === 0) return [];
  return array1.filter(function(x) { return array2.indexOf(x) !== -1; });
}
function makeScaleCoordinatesFunction(width1, width2) {
  return function(location) {
    return location + (width2 - width1) * Math.floor(location / width1);
  };
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
