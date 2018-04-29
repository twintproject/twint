import sys
import tarfile
import os

tarball = os.path.abspath(sys.argv[1])
dirname = os.path.abspath(sys.argv[2])
tfile = tarfile.open(tarball,'r:gz');
tfile.extractall(dirname)
sys.exit(0)
