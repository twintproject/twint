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

def Csv(obj, config):
    fieldnames, row = struct(obj, config.Custom, Type(config))

    if not (os.path.exists(config.Output)):
        with open(config.Output, "w", newline='', encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()

    with open(config.Output, "a", newline='', encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writerow(row)

def Json(obj, config):
    null, data = struct(obj, config.Custom, Type(config))

    with open(config.Output, "a", newline='', encoding="utf-8") as json_file:
        json.dump(data, json_file)
        json_file.write("\n")
