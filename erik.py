'''
Play area:
- Create list fo files
'''
import yaml
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
    filesinfo = configdict.get('files', ['no files'])

    return filesinfo


print(ParseFilesFromConfig(ReadConfigFileLocal()))





