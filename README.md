# Snakefall

A [Snakebird](http://snakebird.noumenongames.com/) clone.

## Demo

[http://wolfesoftware.com/snakefall/](http://wolfesoftware.com/snakefall/)

And check out some levels people have made:

[Snakefall Wiki](https://github.com/thejoshwolfe/snakefall/wiki)

## Status

* Game Engine:
  * Everything from the original game (except that the left, right, and top border of the map are impassable).
  * Undo and redo movement. Repeatedly hitting redo after a reset will effectively show a replay.
  * Arbitrarily many snakes. A fourth snake color (yellow). More hotkeys for switching snakes.
  * Size-1 snakes.
* Editor:
  * Edit the game while it's running.
    * Undo/redo edits independently of undo/redo normal movement. Can create time travel paradoxes.
  * Resize the world.
  * Select/Cut/Copy/Paste (but not between browser tabs).
  * Cheatcodes to turn off gravity and collision detection (noclip) while editing.
  * Share levels with a url that encodes the level. No server-side saving (because there's no server at all).

See the [issue tracker](https://github.com/thejoshwolfe/snakefall/issues) for more status.
