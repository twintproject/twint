from os import listdir

result=''

myfiles = [f for f in listdir('tmpdata')]
for f in myfiles:
    result = result + '\n' + f

print(result)