# Snakefall

A [Snakebird](http://snakebird.noumenongames.com/) clone.

## Demo

[http://wolfesoftware.com/snakefall/](http://wolfesoftware.com/snakefall/)

## Status

* Game Engine:
  * Everything from the original game except for the shtick in levels 30-38.
  * A fourth snake (yellow).
  * Size-1 snakes.
* Editor:
  * Edit the game while it's running.
  * Place and edit everything the game engine supports.
  * Cheatcodes to turn off gravity and collision detection (noclip) while editing.
  * Level data is json text that you can copy out and paste in. No server-side saving (because there's no server at all).

### TODO

Important:

* Game Engine:
  * Enable Snakebird levels 30-38
  * Remove hard ceiling.
  * Resize the world.
* Editor:
  * Select/Cut/Copy/Paste.
  * Detect and show errors: collision/gravity violations, no snakes or no exit, etc.
  * Figure out how unmove and unedit should interact.
  * Stabilize level format: version numbers, upconversions.
* Solver AI.
* Level select/loading/sharing:
  * Ability to queue up several levels and play them all in sequence.
  * Consider encoding level data in a url to share easily.
  * Consider server-based community hub for sharing and rating levels.

Fun stuff maybe someday:

 * Lasers and mirrors (of course)
 * Buttons and doors (why not)
 * Actual graphics?
   * Background decorations?
   * Different kinds of fruit?
 * Animated movement?
 * [Curious George](http://steamcommunity.com/stats/357300/achievements) achievement (just kidding)
