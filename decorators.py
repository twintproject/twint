"""Trialing the use of decorator, initially to get cleaner code to deal
with Google Cloud bucket vs. local files

For decorator explanation:
https://gist.github.com/Zearin/2f40b7b9cfc51132851a
https://realpython.com/primer-on-python-decorators/#decorators-with-arguments
"""
# Erik
import functools
from google.cloud import storage
import os
import shutil


class MakeCloudSafe():
    """Before the wrapped function is executed, get the file provided
    from Google Cloud bucket when running in Google Cloud environment. If
    running locally, do nothing.
    
    After the function execution, save the file back to the Google bucket.

    TODO: If file does not exist at source, it is unclear what will happen.

    Example usage: In order to wrap the functiom do_someting(str, int):
        MakeCloudSafe('From here', 'to there.').bucket_file(do_something, "hoi", n=3)
        ; where "hoi" and n=3 are arguments to the do_something function.
    """
    # NOTE: This is not actually a decorator.
 
    def __init__(self, srcfilepath, destfilepath) -> None:
        self.srcfilepath = srcfilepath # Bucket (original) file
        self.destfilepath = destfilepath # Working copy

        if os.getenv('GAE_ENV', 'NA').startswith('standard'):
            # Production in the standard environment
            self.Environment_GCP = True

            storage_client = storage.Client()
            bucketName = 'industrious-eye-330414.appspot.com'
            self.bucket = storage_client.get_bucket(bucketName)
        else:
            # Local development server
            self.Environment_GCP = False

            # TODO: This represents hard coded folders
            local_src_dir = os.path.join('tmpdata', 'src')
            local_dest_dir = os.path.join('tmpdata', 'dst')
            self.srcfilepath = os.path.join(local_src_dir, srcfilepath)
            # TODO: This does not actually do anything, since destfilepath is already a folder (see ParseFilesFromConfig)
            self.destfilepath = os.path.join(local_dest_dir, destfilepath) 

    def bucket_file(self, func, *args, **kwargs):
        """In cloud environment, copy file from bucket into usable storage, 
        perform func(*arg, ***kwargs), and copy file back into bucket."""
        
        #TODO: remove all the print statements. Or make it into logging statements.
        
        # ###################
        # Prior to running the provided function
        if self.Environment_GCP:
            print("Getting file from bucket: {}".format(self.srcfilepath))
            #TODO: error handling (log when file does not exist; but continue)
            blob = self.bucket.blob(self.srcfilepath)
            # if exists in cloud bucket, copy file from bucket into tmp (but usable) GCP storage
            if blob.exists():
                blob.download_to_filename(self.destfilepath)
                print("Obtained from bucket: {}. Put here: {}.".format(self.srcfilepath, self.destfilepath))
        else:
            if os.path.isfile(self.srcfilepath):
                shutil.copyfile(self.srcfilepath, self.destfilepath)

        # ###################
        # Run the provided function
        func(*args, **kwargs)

        #print(self.destfilepath)

        # ###################
        # Subsequent to running the provided function
        # copy file back into cloud bucket
        if self.Environment_GCP:
            #TODO: error handling (log when file does not exist; but continue?)
            print("Putting file back to bucket: {}".format(self.srcfilepath))
            blob = self.bucket.blob(self.srcfilepath)
            # copy file back into permanent Google storage bucket    
            blob.upload_from_filename(self.destfilepath)
            print("File put back to bucket: {} (from). Put here: {}.".format(self.destfilepath, self.srcfilepath))
        else:
            if os.path.isfile(self.destfilepath):
                shutil.copyfile(self.destfilepath, self.srcfilepath)

# ################
# Example
def do_something(txt: str, n: int = 0):
    for i in range(n):
        print(txt)

# TODO: Cause error in Cloud App Engine deployment (with blob.upload_from_filename(self.srcfilepath))
# MakeCloudSafe('From here', 'to there.').bucket_file(do_something, "hoi", n=3)
# ################
