#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Jack
"""Verify the distributable's size, licenses and absence of private keys."""
import pathlib
import sys
import zipfile

path = pathlib.Path(sys.argv[1])
assert path.stat().st_size < 1_000_000, 'APK exceeds the 1 MB target'
root = pathlib.Path(__file__).resolve().parents[1]
with zipfile.ZipFile(path) as apk:
    assert apk.read('assets/legal/LICENSE') == (root / 'LICENSE').read_bytes()
    assert apk.read('assets/legal/NOTICE') == (root / 'NOTICE').read_bytes()
    assert b'SIL OPEN FONT LICENSE' in apk.read('assets/Nunito-OFL.txt')
    for asset in ('index.html', 'calendar.js', 'style.css'):
        assert apk.read('assets/' + asset) == (root / 'app/src/main/assets' / asset).read_bytes(), 'APK contains stale UI: ' + asset
    assert 'classes.dex' in apk.namelist()
    for name in apk.namelist():
        assert not name.lower().endswith(('.jks', '.keystore', '.p12', '.pfx', '.pem', '.key'))
print('PASS: APK below 1 MB, Apache and font licenses included, no private key files.')
