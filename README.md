# Snakefall

A [Snakebird](http://snakebird.noumenongames.com/) clone with a level editor.

If you haven't played Snakebird yet, go buy it and play it. It's great!
This project is not trying to compete with the original game,
but instead tries to realise even more potential inherent in the genius
of the original game engine design.

This project enables players to create their own levels and share them with others.

## Demo

[http://wolfesoftware.com/snakefall/](http://wolfesoftware.com/snakefall/)

And check out some levels people have made:

[Snakefall Wiki](https://github.com/thejoshwolfe/snakefall/wiki)

## Bugs and Ideas

See the [issue tracker](https://github.com/thejoshwolfe/snakefall/issues).

## Version History

#### 1.1.0

* Ability to share replays. ([issue #9](https://github.com/thejoshwolfe/snakefall/issues/9))
* Redoing normal movement shows the animation just like if you were playing.
* Remove "playtest" button and overhaul dirty states.
* Use semver-like version numbers instead of just linking to the git hash.
* Finally add a link to the wiki on the actual game page.

#### 1.0.0

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

