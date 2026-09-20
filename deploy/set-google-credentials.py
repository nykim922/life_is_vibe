#!/usr/bin/env python3
import getpass
import json
import os
from pathlib import Path
import re
import sys

if not sys.stdin.isatty():
    raise SystemExit('EC2 대화형 터미널에서 직접 실행해 주세요.')
p = Path('/home/ec2-user/campusfit-release/server/.env')
client_id = getpass.getpass('Google Client ID (입력 내용 숨김): ').strip()
client_secret = getpass.getpass('Google Client Secret (입력 내용 숨김): ').strip()
if not re.fullmatch(r'[A-Za-z0-9._-]+\.apps\.googleusercontent\.com', client_id):
    raise SystemExit('Client ID 형식을 확인해 주세요. 파일은 변경하지 않았습니다.')
if not client_secret or any(c.isspace() for c in client_secret) or not re.fullmatch(r'[A-Za-z0-9_-]+', client_secret):
    raise SystemExit('Client Secret 형식을 확인해 주세요. 파일은 변경하지 않았습니다.')
values = {'GOOGLE_CLIENT_ID': client_id, 'GOOGLE_CLIENT_SECRET': client_secret}
lines = p.read_text().splitlines()
lines = [line for line in lines if line.split('=', 1)[0] not in values]
lines += [k + '=' + v for k, v in values.items()]
tmp = p.with_name('.env.pending')
fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write('\n'.join(lines) + '\n')
    f.flush()
    os.fsync(f.fileno())
os.replace(tmp, p)
print('Google 인증정보를 권한 0600 환경파일에 저장했습니다. 비밀값은 출력하지 않았습니다.')
