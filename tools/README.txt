IHCC site tools. Run them from the main folder of the repository.

tools/build.py   Makes constitution.html, rulebook.html and the two draft .txt files from the texts in tools/masters (constitution.txt, rb1.txt, rb2.txt). Edit a master, then run it.
tools/stamp.py   Puts a fingerprint in every ?v= of a .js or .css link. Run it after every change of a script or style file, before pushing.
tools/check.py   The automatic test. GitHub Actions runs it on every push (file .github/workflows/check.yml). Run it yourself before pushing.

Order for a text change: edit tools/masters, python3 tools/build.py, python3 tools/stamp.py, python3 tools/check.py, push.
