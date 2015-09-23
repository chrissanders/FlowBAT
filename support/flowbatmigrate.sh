#!/bin/bash
# Manually cd to the FlowBAT project directory and  start meteor dev so that you can grab a copy of the db. You're probably doing this while node is
# running, so we will start meteor on port 1900 temporarily.
# meteor --port 1900 run --settings settings/dev.json "$@"

# Create a safe place to copy the db.
mkdir ~/fbdevbackup

# Dump the db from the meteor dev instance of FlowBAT to ~/fbdevbackup
mongodump -h 127.0.0.1 --port 1901 -d meteor -o ~/fbdevbackup

# Remove the current prod database in the running node instance.
mongo flowbat --eval "db.dropDatabase()"

# Restore the dev backup to the prod node instance.
mongorestore -h 127.0.0.1:27017 -d flowbat ~/fbdevbackup/meteor/

# Manually remove backup DB and location
# rm -rf ~/fbdevbackup
