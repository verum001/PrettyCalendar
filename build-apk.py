#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Jack
"""Small Android build using only Python, a JDK and the Android SDK.

Set ANDROID_SDK_ROOT, then run python3 build-apk.py.
Default signing uses the standard private ~/.android/debug.keystore.
For release signing, supply PRETTY_KEYSTORE, PRETTY_KEY_ALIAS,
PRETTY_STORE_PASSWORD and optionally PRETTY_KEY_PASSWORD as environment variables.
No signing passwords or keys are written into the project or APK.
"""
import os
import pathlib
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
SDK = pathlib.Path(os.environ['ANDROID_SDK_ROOT']).expanduser().resolve()
TOOLS = SDK / 'build-tools' / '35.0.0'
ANDROID = SDK / 'platforms' / 'android-35' / 'android.jar'
SRC = ROOT / 'app' / 'src' / 'main'
OUT = ROOT / 'build'
VERSION = dict(line.strip().split('=', 1) for line in
               (ROOT / 'version.properties').read_text().splitlines()
               if line.strip() and not line.lstrip().startswith('#'))


def run(*args):
    subprocess.run([str(a) for a in args], check=True, cwd=ROOT)


OUT.mkdir(exist_ok=True)
for directory in ('classes', 'dex'):
    shutil.rmtree(OUT / directory, ignore_errors=True)
    (OUT / directory).mkdir()

# Both build routes ship the same notices; copies are also committed for Gradle.
legal = SRC / 'assets' / 'legal'
legal.mkdir(exist_ok=True)
for name in ('LICENSE', 'NOTICE'):
    shutil.copyfile(ROOT / name, legal / name)

# Gradle owns package/version attributes in its source manifest. Generate a
# separate manifest for AAPT2 rather than breaking Android Studio compatibility.
ns = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ns)
manifest = ET.parse(SRC / 'AndroidManifest.xml')
manifest.getroot().set('package', 'com.prettycalendar.app')
manifest.getroot().set('{%s}versionCode' % ns, VERSION['versionCode'])
manifest.getroot().set('{%s}versionName' % ns, VERSION['versionName'])
manifest.write(OUT / 'AndroidManifest.xml', encoding='utf-8', xml_declaration=True)

run(TOOLS / 'aapt2', 'compile', '--dir', SRC / 'res', '-o', OUT / 'resources.zip')
run(TOOLS / 'aapt2', 'link', '-o', OUT / 'base.apk', '-I', ANDROID,
    '--manifest', OUT / 'AndroidManifest.xml', '-A', SRC / 'assets',
    '--min-sdk-version', '26', '--target-sdk-version', '35', OUT / 'resources.zip')
sources = sorted((SRC / 'java').rglob('*.java'))
run('java', '-m', 'jdk.compiler/com.sun.tools.javac.Main', '-source', '8',
    '-target', '8', '-encoding', 'UTF-8', '-bootclasspath',
    str(ANDROID) + os.pathsep + str(TOOLS / 'core-lambda-stubs.jar'),
    '-d', OUT / 'classes', *sources)
classes = sorted((OUT / 'classes').rglob('*.class'))
run(TOOLS / 'd8', '--release', '--lib', ANDROID, '--min-api', '26',
    '--output', OUT / 'dex', *classes)
with zipfile.ZipFile(OUT / 'base.apk', 'a', compression=zipfile.ZIP_DEFLATED) as apk:
    for dex in sorted((OUT / 'dex').glob('*.dex')):
        apk.write(dex, dex.name)
run(TOOLS / 'zipalign', '-f', '-p', '4', OUT / 'base.apk', OUT / 'aligned.apk')

if os.environ.get('PRETTY_KEYSTORE'):
    key = pathlib.Path(os.environ['PRETTY_KEYSTORE']).expanduser().resolve()
    if not key.is_file():
        raise SystemExit('PRETTY_KEYSTORE must point to an existing private key file.')
    if not os.environ.get('PRETTY_STORE_PASSWORD'):
        raise SystemExit('Set PRETTY_STORE_PASSWORD for release signing.')
    alias = os.environ.get('PRETTY_KEY_ALIAS', 'pretty-calendar')
    os.environ.setdefault('PRETTY_KEY_PASSWORD', os.environ['PRETTY_STORE_PASSWORD'])
    store_pass = 'env:PRETTY_STORE_PASSWORD'
    key_pass = 'env:PRETTY_KEY_PASSWORD'
else:
    key = pathlib.Path.home() / '.android' / 'debug.keystore'
    alias = 'androiddebugkey'
    store_pass = key_pass = 'pass:android'
    if not key.exists():
        key.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        run('keytool', '-genkeypair', '-keystore', key, '-storepass', 'android',
            '-keypass', 'android', '-alias', alias, '-keyalg', 'RSA', '-keysize',
            '2048', '-validity', '10000', '-dname', 'CN=Android Debug,O=Android,C=US')
        key.chmod(0o600)

dest = OUT / ('pretty-calendar-' + VERSION['versionName'] + '.apk')
run(TOOLS / 'apksigner', 'sign', '--ks', key, '--ks-key-alias', alias,
    '--ks-pass', store_pass, '--key-pass', key_pass, '--out', dest, OUT / 'aligned.apk')
run(TOOLS / 'apksigner', 'verify', '--verbose', dest)
run(TOOLS / 'zipalign', '-c', '-p', '4', dest)
print('APK:', dest)
print('Size:', dest.stat().st_size, 'bytes (target: below 1,000,000 bytes)')
