# Running Boss Talk

make sure config.json is set up
do reindex should only be true for when new sounds have been loaded from git

Boss Talk is run with `pm2` or `forever` for process management

To start Boss Talk:
`pm2 start ./index.js --attach`

To monitor logs:
`pm2 log`

OR

To start Boss Talk:
`forever ./index.js`

# Updating Boss Talk
Github has an action set up to reach into the linux instance and kill and restart bosstalk.
