'''
Play area:
- Create list fo files
'''
import yaml
import os
from google.cloud import storage


def ReadConfigFileGCP():
    CONFIG_FILE = 'configgcp.yaml'

    #TODO: use GCP credentials; would allow for local testing
    storage_client = storage.Client()
    bucketName = 'industrious-eye-330414.appspot.com'
    bucket = storage_client.get_bucket(bucketName)
    
    blob = bucket.blob(CONFIG_FILE)
    data = blob.download_as_string(client=None)

    configdict = yaml.safe_load(data)

    return configdict


def ReadConfigFileLocal():
    ''' 
    Returns a dict with the contents of config file
    '''
    CONFIG_FILE = 'configgcp.yaml'

    # TODO: Confirm file exists
    with open(CONFIG_FILE, 'rt') as file:
        configdict = yaml.safe_load(file.read())

    return configdict



def ParseFilesFromConfig(configdict):
    '''
    Read file information from configgcp file
    
    arguments:
    - configdict: dictionary containing the configfile info

    Returns a list of dictionary values representing files to update with tweets
    and their search terms. 

    This function is indepenent of location of config file (cloud, local etc.)
    '''
    bucket_dir = os.path.join('')
    local_dir = os.path.join('/tmp')
    
    filesinfo = configdict.get('files', ['no files'])

    for f in filesinfo:
        f['bucketfilepath'] = os.path.join(bucket_dir, f.get('filename'))
        #f['bucketfilepath'] = os.path.join(bucket_dir, 'erik')
        f['localfilepath'] = os.path.join(local_dir, f.get('filename'))

    return filesinfo


print(ParseFilesFromConfig(ReadConfigFileLocal()))





