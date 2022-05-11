"""
Some core application settings.
"""
import google.cloud.logging
from google.cloud import storage
from dotenv import load_dotenv
import os
from pydantic import (
    BaseModel,
    BaseSettings,
    PyObject,
    RedisDsn,
    PostgresDsn,
    AmqpDsn,
    Field,
)


load_dotenv()


# pydantic settings management
# https://pydantic-docs.helpmanual.io/usage/settings/
# To set up environment variables:
# > export DB_USER=test_user
class Settings(BaseSettings):
    # Whether executing in Google Cloud Environment
    Environment_GCP: bool = False

    URL_LATEST_TWEET: str = 'https://dbcontroller-7zupgnxiba-uc.a.run.app/latesttweet'
    URL_CAPTURE_TWEETS: str = 'https://dbcontroller-7zupgnxiba-uc.a.run.app/tweets'
    URL_UPDATE_METRICS_FILES: str = 'https://dbcontroller-7zupgnxiba-uc.a.run.app/metrics'
    GCP_BUCKET: str = 'industrious-eye-330414.appspot.com'

    # Determine whether we run in GCP environment
    if os.getenv('GAE_ENV', 'NA').startswith('standard') or (os.getenv('K_SERVICE', 'NA') != 'NA'):
        # GAE_ENV works with Google App Engine, K_SERVICE with Google Cloud Run.
        # Production in the standard environment
        Environment_GCP = True
    else:
        # Local development server
        Environment_GCP = False


    class Config:
        env_prefix = "tern"  # Not sure what the effect is. defaults to no prefix, i.e. ""
        case_sensitive = False # Will always be False in Windows

        env_file = '.env'
        env_file_encoding = 'utf-8'

        fields = {
            'Environment_GCP': {
                'env': 'Environment_GCP'
            },
            'URL_LATEST_TWEET': {
                'env': 'URL_LATEST_TWEET'
            },
            'URL_CAPTURE_TWEETS': {
                'env': 'URL_CAPTURE_TWEETS'
            },
            'URL_UPDATE_METRICS_FILES': {
                'env': 'URL_UPDATE_METRICS_FILES'
            },
            'GCP_BUCKET': {
                'env': 'GCP_BUCKET'
            },
        }
        

app_settings = Settings()
if app_settings.Environment_GCP:
        # Setup Google Cloud logging: https://cloud.google.com/logging/docs/setup/python#installing_the_library
        client = google.cloud.logging.Client()
        client.setup_logging()