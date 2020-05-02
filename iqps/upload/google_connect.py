from __future__ import print_function
import pickle
import os.path
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Source: Google Drive API Python Quickstart

SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.appdata']

def connect():
    creds = None

    if os.path.exists(os.path.join('conf', 'token.pickle')):
        with open(os.path.join('conf', 'token.pickle'), 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                os.path.join('conf', 'credentials.json'), SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(os.path.join('conf', 'token.pickle'), 'wb') as token:
            pickle.dump(creds, token)

    service = build('drive', 'v3', credentials=creds)
    return service

def upload_file(local_path, remote_name, folderId=None, service=None):
    if service is None:
        service = connect()

    file_metadata = {'name': remote_name}
    if folderId:
        file_metadata['parents'] = [folderId]

    media = MediaFileUpload(local_path)
    file = service.files().create(body=file_metadata,
                                    media_body=media,
                                    fields='webContentLink').execute()
    return file.get('webContentLink', None)
     
def get_or_create_folder(remote_name, public=False, service=None):
    if service is None:
        service = connect()
    folder_id = None
    query = "name='{}' and mimeType='application/vnd.google-apps.folder'".format(remote_name)

    try:
        response = service.files().list(q=query,
                                       spaces='drive',
                                       fields='nextPageToken, files(id, name)',
                                       pageToken=None).execute()
        assert response.get('files', []) != []
        for folder in response.get('files'):
            folder_id = folder.get('id')
            break
    except Exception as e:
        file_metadata = {
            'name': remote_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }

        folder = service.files().create(body=file_metadata, fields='id').execute()
        folder_id = folder.get('id')

        if public:
            user_permission = {
                'type': 'anyone',
                'role': 'reader'
            }

            folder = service.permissions().create(
                fileId=folder_id,
                body=user_permission,
                fields='id').execute()
    finally:
        return folder_id
        
     
