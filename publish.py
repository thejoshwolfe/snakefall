#!/usr/bin/env python

import sys
import subprocess
import re

git_status_regex = re.compile("On branch (.*)")

def main():
  git_status_output = subprocess.check_output(["git", "status"])
  git_status_match = git_status_regex.match(git_status_output)
  if git_status_match == None:
    sys.exit("ERROR: git status didn't include branch?")
  branch_name = git_status_match.group(1)
  if branch_name == "master":
    prefix = ""
  else:
    prefix = "experimental/" + branch_name

  cmd = ["rsync", "-vaz", "--delete", "--exclude=.*", "--exclude=experimental/", "./", "server:public_http/snakefall/" + prefix]
  print(" ".join(cmd))
  subprocess.check_call(cmd)

if __name__ == "__main__":
  main()
