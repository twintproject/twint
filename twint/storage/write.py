from . import write_meta as meta
import csv
import json
import os

def Text(entry, f):
    print(entry, file=open(f, "a", encoding="utf-8"))

def Type(config):
    if config.User_full:
        _type = "user"
    elif config.Followers or config.Following:
        _type = "username"
    else:
        _type = "tweet"

    return _type

def struct(obj, custom, _type):
    if custom:
        fieldnames = custom
        row = {}
        for f in fieldnames:
            row[f] = meta.Data(obj, _type)[f]
    else:
        fieldnames = meta.Fieldnames(_type)
        row = meta.Data(obj, _type)

    return fieldnames, row

def createDirIfMissing(dirname):
    if not os.path.exists(dirname):
        os.makedirs(dirname)

def Csv(obj, config):
    _obj_type = obj.__class__.__name__
    base = config.Output

    if _obj_type == "str":
        _obj_type = "username"
    Output_json = {"tweet": "/tweets.csv",
                  "user": "/users.csv",
                  "username": "/usernames.csv"}

    fieldnames, row = struct(obj, config.Custom[_obj_type], _obj_type)

    if len(base.split('.')) == 1:
        createDirIfMissing(base)
        base += Output_json[_obj_type]

    if not (os.path.exists(base)):
        with open(base, "w", newline='', encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()

    with open(base, "a", newline='', encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writerow(row)

def Json(obj, config):
    _obj_type = obj.__class__.__name__
    base = config.Output

    if _obj_type == "str":
        _obj_type = "username"
    Output_json = {"tweet": "/tweets.json",
                  "user": "/users.json",
                  "username": "/usernames.json"}

    null, data = struct(obj, config.Custom[_obj_type], _obj_type)

    if len(base.split('.')) == 1:
        createDirIfMissing(base)
        base += Output_json[_obj_type]

    with open(base, "a", newline='', encoding="utf-8") as json_file:
        json.dump(data, json_file, ensure_ascii=False)
        json_file.write("\n")
