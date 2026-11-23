# Code review · version 0.1.2

Reviewed 22 November 2026. Scope: application Java, HTML/CSS/JavaScript, storage and gesture logic, build scripts, source distribution, notices, APK size and signing. This is a focused source review, not a penetration test or physical-device certification.

## Changes in 0.1.2

- One active cycle: selecting a new violet date replaces the old date, heart and pink flower. A rejected save restores the whole previous cycle. Holding the active lotus clears the cycle.
- Day 1 uses a pointed, layered violet lotus SVG; day 28 keeps its round pink blossom. Both the calendar and legend use distinct symbols.
- Older multi-cycle data displays its latest dated anchor. Its stored array remains untouched during reading; the next successful edit saves only the single active date. The native bridge rejects writes with multiple dates.
- Gentle motion uses CSS transforms/opacity on the existing mascot and three tiny petals. It adds no images, runtime libraries or JavaScript animation loop. Android pause/resume and document visibility pause decorative motion and stop clock polling. Reduced-motion preferences disable the animation.
- Tiny coral footer credit: “by Jack Littlejack”. Tested for clipping at 320×568, 360×740, 412×740 and landscape 640×360.
- Version code 3 allows an in-place update signed with the existing private key.

## Findings fixed in 0.1.1

| Finding | Change | Verification |
| --- | --- | --- |
| The previous private source ZIP included a prototype signing key and the builder embedded its password. Publishing that ZIP would disclose the key. | The GitHub source archive excludes all keys. The existing key was moved outside the project, with a separate private backup. Release signing uses environment variables. Default debug signing uses `~/.android/debug.keystore`. | Public archive content scan; existing and new APK certificate comparison. |
| Every scroll extension kept old month elements forever, increasing memory use. | Keep a rolling window of at most 36 months, adjusting scroll position when removing older elements. Saved flowers are independent of the visible window. | Repeated forward/backward extension; bounded element count; duplicate-date check. |
| A corrupt or non-array saved value could be treated as an empty calendar and overwritten by the next mark. | Validate the complete stored payload and disable edits after an unsuccessful read, preserving the original data. A failed write rolls back the in-memory change. | Bridge contract tests with malformed JSON and rejected writes. |
| WebView allowed general file access even though it only needs packaged assets. | Disable general file/content access, cross-file access and network loading. Retain navigation blocking and the restrictive content security policy. | Source review and Android API documentation; packaged asset loading still requires a device smoke test. |
| The source manifest set `package` directly, incompatible with current namespace-based Android Gradle Plugin builds. Versions were duplicated. | Namespace remains in Gradle; the manual builder generates its own manifest. Both routes read `version.properties`. | Manual build and APK manifest inspection. Full Gradle verification was blocked by the environment's Maven network access. |
| Incremental manual builds could retain obsolete class files. | Clear generated class/DEX directories before compilation. Use the JDK compiler directly, removing the ECJ requirement. | Successful clean manual build with SDK 35 and JDK 21. |
| Native and JavaScript dates disagreed for early Gregorian dates; JavaScript's `Date.UTC` also maps years 0–99 to 1900–1999. | Explicit full-year UTC construction, year-zero rejection and proleptic Gregorian parsing. | Date arithmetic and invalid-date regression checks; native path compiled but not executed on Android. |
| The project did not contain an Apache license; its font has a different license. | Add unmodified Apache-2.0 text, NOTICE, first-party source headers and third-party notices. Bundle the Apache and unmodified font licenses in the APK. | Exact license-content comparison inside the APK. |
| The large launcher PNG contributed unnecessary APK bytes. | Encode the same pixels as lossless WebP. Keep the original high-resolution artwork only in the source tree. | Decoded pixel comparison; APK byte-size check. |

## Size

| APK | Bytes | Decimal MB |
| --- | ---: | ---: |
| 0.1.0 | 402,693 | 0.403 |
| 0.1.1 | 361,865 | 0.362 |
| 0.1.2 | 361,865 | 0.362 |

The current APK is about 10.1% smaller than 0.1.0. The lotus, animation and footer credit do not increase the signed APK byte size compared with 0.1.1 (ZIP/signature alignment is padded). The goal is below 1,000,000 bytes, not a 1 MB minimum. Source ZIP size is separate from installed app/package size. Installed size depends on Android and is not measured here.

## Validation

- Java compilation, AAPT2 resource linking, D8 bytecode generation and APK packaging succeeded.
- APK Signature Scheme v2/v3 verification and zip alignment succeeded. The signing certificate matches 0.1.0 and 0.1.1.
- `tests/check-apk.py` verifies the APK is below 1,000,000 bytes, contains the Apache and font notices, has no private key files, and ships UI assets identical to the reviewed sources.
- Playwright checks single-cycle replacement, complete removal of previous calculated dates, replacing a predicted heart with a new lotus, persistence, rejected-write rollback, legacy multi-cycle data, distinct lotus/flower SVGs, animation pause/resume, reduced motion, footer credit placement, date arithmetic, live theme transitions, midnight updates, scroll cancellation, bounded month rendering, English UI and no buttons.
- No Android runtime dependencies were added. npm and Gradle dependencies are development tools and are not included in the APK.

## Limits

- Physical-device install, Android SharedPreferences persistence, TalkBack interaction, and Android System WebView rendering have not been tested on a real phone/emulator.
- Gradle/Android lint could not finish because the environment could not connect to Maven through its configured Java proxy. The provided APK was built and verified using the independent manual SDK build. The GitHub Actions workflow is prepared but has not run on GitHub.
- Android WebView updates remain the device owner's responsibility. Clearing app data or uninstalling intentionally removes saved marks; cloud backup is disabled.

## Publishing

Use the updated `pretty-calendar-source.zip`. Do not publish the previous source ZIP or the separate `pretty-calendar-signing-backup-PRIVATE.zip`.

The source includes the Gradle wrapper, a dependency lockfile for interface tests, and a GitHub Actions workflow. Uploading the source and a release APK to GitHub remains the owner's action; this task does not publish externally.
