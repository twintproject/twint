"""
Erik

Some core application settings.
"""
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

    # Determine whether we run in GCP environment
    if os.getenv('GAE_ENV', 'NA').startswith('standard'):
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
        }
        

app_settings = Settings()

