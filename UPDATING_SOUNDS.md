# Updating Boss Talk

To update sounds with new patch releases:
1. use wow export (from wow tools)
2. replace `sounds/creature` with new folders

To re-add pictures to database:
1. Redo css selector on google images search  (in `/src/indexPictures.js`)
2. test a creature with `node ./src/indexPictures.js test <creatureName>` (no brackets)
3. run node ./src/indexPicutres.js

To reindex creature to database:
1. set `doReindex` flag in config.json to `true` 
2. run boss talk `node .`

