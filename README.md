# Snakefall

A [Snakebird](http://snakebird.noumenongames.com/) clone.

## Demo

[http://wolfesoftware.com/snakefall/](http://wolfesoftware.com/snakefall/)

Check out some levels I made:

* [Disabilities Act](http://wolfesoftware.com/snakefall/#level=3tFRIoTU&17&29?*z0*10*11*I0111000111*K03*z0*z0*R03*701*704*003*701*E0122*002211122*00221*401110*910111*z0*M0/s0?323&322&351/s1?43/s2?101&102&131&160&159&158&129&100/)
* [Crashing Down](http://wolfesoftware.com/snakefall/#level=3tFRIoTU&17&31?*z0*z0*z0*Q03*704*z0*H01*P0111*G03*20*11*203*E0*31*D0111000*51000111*60*H1*X0/b0?199&170&168&167&197&171&203&165&173&205&195&164&163&194&174&175&206&106&201&44&108&46/s1?426/s0?408/)

## Status

* Game Engine:
  * Everything from the original game.
  * Undo and redo movement. Repeatedly hitting redo after a reset will effectively show a replay.
  * A fourth snake (yellow).
  * Size-1 snakes.
* Editor:
  * Edit the game while it's running.
    * Undo/redo edits independently of undo/redo normal movement. Can create time travel paradoxes.
  * Place and edit everything the game engine supports.
  * Resize the world.
  * Select/Cut/Copy/Paste (but not between browser tabs).
  * Cheatcodes to turn off gravity and collision detection (noclip) while editing.
  * Share levels with a url that encodes the level. No server-side saving (because there's no server at all).

See the [issue tracker](https://github.com/thejoshwolfe/snakefall/issues) for more status.
