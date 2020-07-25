#!/usr/bin/env python

import dropbox
import traceback
import sys
import os

access_token = os.environ['DROPBOX_ACCESS_TOKEN']

client = dropbox.Dropbox(access_token)

file_name = sys.argv[1]

with open(file_name, 'rb') as f:
    try:
        if os.path.getsize(file_name) < 32 * 1024 * 1024:
            result = client.files_upload(f.read(), "/" + file_name)
            print result
        else:
            chunksize = 32 * 1024 * 1024
            next_chunk = f.read(chunksize)
            session = client.files_upload_session_start(next_chunk)
            uploaded = len(next_chunk)
            next_chunk = f.read(chunksize)
            cursor = dropbox.files.UploadSessionCursor(session.session_id, uploaded)
            print "Uploaded: ", float(uploaded) / (1024 * 1024), "MB"
            while next_chunk:
                client.files_upload_session_append_v2(next_chunk, cursor)
                uploaded += len(next_chunk)
                cursor = dropbox.files.UploadSessionCursor(session.session_id, uploaded)
                print "Uploaded: ", float(uploaded) / (1024 * 1024), "MB"

                next_chunk = f.read(chunksize)

            commit_info = dropbox.files.CommitInfo(path="/" + file_name)
            result = client.files_upload_session_finish(f.read(), cursor, commit_info)
            print result
    except Exception as e:
        print traceback.format_exc()
