#!/usr/bin/env python3
"""Enter OAuth credentials locally without displaying them or changing other settings."""
import getpass
import os
from pathlib import Path
import re
import tempfile

path = Path(__file__).resolve().parents[1] / 'server' / '.env'
client_id = getpass.getpass('Google Client ID (입력 숨김): ').strip()
client_secret = getpass.getpass('Google Client Secret (입력 숨김): ').strip()
if not re.fullmatch(r'[A-Za-z0-9._-]+\.apps\.googleusercontent\.com', client_id):
    raise SystemExit('Client ID 형식을 확인해 주세요. 파일은 변경하지 않았습니다.')
if not re.fullmatch(r'[A-Za-z0-9_-]+', client_secret):
    raise SystemExit('Client Secret 형식을 확인해 주세요. 파일은 변경하지 않았습니다.')
values = {'GOOGLE_CLIENT_ID': client_id, 'GOOGLE_CLIENT_SECRET': client_secret}
lines = [line for line in path.read_text().splitlines()
         if line.split('=', 1)[0].strip() not in values]
lines.extend(key + '=' + value for key, value in values.items())
fd, temporary = tempfile.mkstemp(prefix='.env-', dir=path.parent)
with os.fdopen(fd, 'w') as stream:
    stream.write('\n'.join(lines) + '\n')
    stream.flush()
    os.fsync(stream.fileno())
os.replace(temporary, path)
print('저장 완료. 채팅에 입력 완료라고 알려 주세요. 비밀 값은 보내지 마세요.')
