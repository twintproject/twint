import twint
import os

'''
Test.py - Testing TWINT to make sure everything works.
'''

def test_reg(c, run):
    print("[+] Beginning vanilla test in {}".format(str(run)))
    run(c)

def test_db(c, run):
    print("[+] Beginning DB test in {}".format(str(run)))
    c.Database = "test_twint.db"
    run(c)

def custom(c, run, _type):
    print("[+] Beginning custom {} test in {}".format(_type, str(run)))
    c.Custom['tweet'] = ["id", "username"]
    c.Custom['user'] = ["id", "username"]
    run(c)

def test_json(c, run):
    c.Store_json = True
    c.Output = "test_twint.json"
    custom(c, run, "JSON")
    print("[+] Beginning JSON test in {}".format(str(run)))
    run(c)

def test_csv(c, run):
    c.Store_csv = True
    c.Output = "test_twint.csv"
    custom(c, run, "CSV")
    print("[+] Beginning CSV test in {}".format(str(run)))
    run(c)

def main():
    c = twint.Config()
    c.Username = "verified"
    c.Limit = 20
    c.Store_object = True

    # Seperate objects are neccessary.

    f = twint.Config()
    f.Username = "verified"
    f.Limit = 20
    f.Store_object = True
    f.User_full = True
    
    runs = [twint.run.Following,
            twint.run.Followers,
            twint.run.Search,
            twint.run.Profile,
            twint.run.Favorites
            ]
    
    tests = [test_reg, test_json, test_csv, test_db]
    
    # Something breaks if we don't split these up

    for run in runs[:2]: 
        for test in tests:
            test(f, run)

    for run in runs[2:]:
        if run == twint.run.Search:
            c.Since = "2012-1-1 20:30:22"
            c.Until = "2017-1-1"
        else:
            c.Since = ""
            c.Until = ""
        
        for test in tests:
            test(c, run)

    files = ["test_twint.db", "test_twint.json", "test_twint.csv"]
    for _file in files:
       os.remove(_file)


    print("[+] Testing complete!")

if __name__ == '__main__':
    main()
