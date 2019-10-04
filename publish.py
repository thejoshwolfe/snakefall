#!/usr/bin/env python3

import sys
import subprocess
import re
import os

def main():
    # generate version.js
    version = git("rev-parse", "--short", "HEAD").rstrip()
    if re.match(r"^[0-9a-f]{4,40}$", version) == None:
        sys.exit("ERROR: malformed git rev-parse output: " + repr(version))
    with open("version.js", "w") as f:
        f.write('var VERSION = "{}";\n'.format(version))

    # determine experimental branch
    branch_name = git("rev-parse", "--abbrev-ref", "HEAD").rstrip()
    if branch_name == "master":
        publish_subdir = ""
    else:
        subdir = "experimental/" + branch_name
        if os.path.normpath(subdir) != subdir:
            sys.exit("ERROR: strange path characters in branch name: " + repr(branch_name))
        publish_subdir = subdir + "/"

    cmd = [
        "s3cmd", "sync",
        "-P", "--no-preserve", "--add-header=Cache-Control: max-age=0, must-revalidate",
        "index.html", "a.js", "version.js",
        "s3://wolfesoftware.com/snakefall/" + publish_subdir,
    ]
    print(" ".join(cmd))
    subprocess.check_call(cmd)

def git(*args):
    cmd = ["git"] + list(args)
    return subprocess.check_output(cmd).decode("utf8")

if __name__ == "__main__":
    main()
