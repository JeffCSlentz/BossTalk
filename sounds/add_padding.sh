
# HOW TO USE
# Put this shell script in the same directory as the creatures folder.
# Make sure SOX is on your PATH:    https://sourceforge.net/projects/sox/
# The / matches directories only.
# The # strips out the parent directories.
# The * matches all files.

# How to use
# Use Git Bash or a Linux Shell
# Type `sh add_padding.sh`

ORIGINALFOLDER="creature/"
NEWFOLDER="newCreature"

mkdir "${NEWFOLDER}"
echo "Made directory ${NEWFOLDER}"

for folder in $ORIGINALFOLDER*/;
do
  echo "Working on ${folder#*/}"
  mkdir "${NEWFOLDER}/${folder#*/}"
  for file in $folder*
  do
    NEWFILE="${NEWFOLDER}/${folder#*/}${file##*/}"  
    echo "Used sox between ${file} and ${NEWFILE}"
    sox "$file" "$NEWFILE" pad 0.1 0.8
  done
done