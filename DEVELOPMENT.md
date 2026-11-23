# pretty calendar

A tiny offline Android calendar with a button-free kawaii interface in English.
Licensed under **Apache-2.0**. Android 8.0+ with an up-to-date Android System WebView.

## Using the calendar

- Scroll vertically through months in either direction. Opens at the current month and keeps at most 36 months in memory.
- Hold a date for 550 ms to start a cycle with a violet lotus. Holding another date replaces the previous cycle and both calculated markers. Hold the active lotus again to clear the cycle.
- A heart appears on day 14 and a pink flower on day 28, counting the selected date as day 1 (+13 and +27 calendar days).
- The violet lotus is the only manual mark. Its pointed layered petals are distinct from the round pink flower on day 28. Pink flowers do not start new chains.
- One cycle is active at a time. When reading older multi-cycle data, the latest calendar date is displayed; legacy storage is retained until the next successful edit saves the single active date.
- A gentle blossom sway and three tiny drifting petals use CSS transforms and opacity only. No extra images, animation libraries, network calls or JavaScript animation loop. Motion and the clock polling timer pause in the background; reduced-motion preferences disable animation.
- The footer carries the micro-size coral credit “by Jack Littlejack”.
- Sakura: 07:00–20:59. Night Sakura: 21:00–06:59. Uses the phone's local time and refreshes after time, date or timezone changes.
- Flowers stay in Android private storage. No network permission, ads, analytics, accounts or cloud backup. Uninstalling or clearing app data deletes the flowers.

The day-14 and day-28 symbols are fixed date reminders, not medical measurements or predictions.

## Install

Download `pretty-calendar-0.1.2.apk` and open it on your Android phone. If prompted, allow installation from the app opening the APK.

## Build in Android Studio or with Gradle

Use JDK 17, Android SDK platform 35 and build-tools 35.0.0. The repository includes the Gradle 8.9 wrapper with a distribution checksum.

```sh
./gradlew :app:assembleDebug :app:lintDebug
```

On Windows, use `gradlew.bat`. The debug APK is in `app/build/outputs/apk/debug/`.

`version.properties` is the shared version source for Gradle and manual builds. There are no third-party Android runtime libraries or native binaries.

## Small APK build without Gradle

Requires Python 3, a JDK with the `jdk.compiler` module (17+), and the same Android SDK packages.

```sh
ANDROID_SDK_ROOT=/path/to/android-sdk python3 build-apk.py
```

This uses AAPT2, the JDK Java compiler, D8, zipalign and apksigner. It builds into `build/` and signs with the standard debug key at `~/.android/debug.keystore`, outside the repository. A missing debug key is generated automatically. It does not download build dependencies.

For a private release key, set `PRETTY_KEYSTORE`, `PRETTY_KEY_ALIAS`, `PRETTY_STORE_PASSWORD` and, when different, `PRETTY_KEY_PASSWORD`. Passwords are passed to signing tools through environment variables. Keep the release key and credentials outside the repository. Gradle release builds are unsigned until you configure your own signing.

The supplied APK uses the same private prototype key as 0.1.0, allowing an update without uninstalling. That key is excluded from these sources. A separate signing backup is provided to the owner; do not upload that backup to GitHub. A separately signed local debug build will require uninstalling the supplied prototype APK first, which clears its saved flowers.

## Checks

```sh
npm ci
npx playwright install chromium
npm test
python3 tests/check-apk.py build/pretty-calendar-0.1.2.apk
```

`CHROMIUM_PATH` can select an installed Chromium executable. Screenshots go to ignored `test-results/`; override with `PRETTY_SCREENSHOTS`.

Tests cover single-cycle replacement, lotus/pink-flower distinction, legacy data, browser persistence, rejected writes, corrupt reads, date arithmetic, live theme transitions, midnight updates, motion pause/resume, reduced-motion preferences, footer credit placement, scroll cancellation, bounded month rendering, and narrow/landscape screens. They do not run the Android SharedPreferences implementation on a phone.

GitHub Actions builds and lints a debug APK, checks its size and notices, runs interface tests, and uploads a build artifact. It does not publish a GitHub Release or upload to a store. See [REVIEW.md](REVIEW.md) for findings and validation limits.

## License and artwork

Copyright 2026 Jack. First-party code and original application artwork are under the [Apache License 2.0](LICENSE). The source distribution and APK include the license and [NOTICE](NOTICE).

The bundled unmodified Nunito font keeps its **SIL Open Font License 1.1**. Its full license is in `app/src/main/assets/Nunito-OFL.txt`. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The smiling sakura launcher artwork was generated for this project. The lossless WebP icon has the same decoded pixels as its previous PNG. Original artwork is retained in `artwork/` and is not bundled in the APK.
