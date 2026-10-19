# Quest Jarvis

A Quest 3 passthrough demo. He is an original cyan scanline hologram in the scanned room, with idle, walk, sit, and talk. Mixamo needs an Adobe login, so the body and those four motions are built in the project. Wake him with his name, or by aiming the headset at him. Otherwise he stays quiet.

Package name: `com.alteoziel.questjarvis`. Update this APK in place. Do not uninstall, or the on-device memory goes with the app. A second copy of that memory is kept in the app's private files, which the APK updater does not replace.

## Say these

1. `Jarvis` — one short reply.
2. `Jarvis, search what is the speed of light` — a real web search, spoken, with a small panel.
3. `Jarvis, remind me at the door to take the keys` — a hologram stuck on the door from Space Setup.
4. `Jarvis, add eye tracking` — he tells you to plug the Quest in and update over SideQuest. He does not pretend it is done.

Aiming the headset at him counts as looking at him. Quest 3 has no eye tracker.

## Once, on the headset

- Turn on developer mode and install the APK with SideQuest. Allow the install from unknown sources if the headset asks.
- Allow the microphone when the app asks.
- Allow Scene / spatial data if the headset asks.
- Run Space Setup and scan the room (floor, door, and a couch, bed, or table). If the room is not scanned, he says so and stands in front of you.

## Build

Unity `6000.5.0f1`, Android ARM64, Meta XR Core and MR Utility Kit. From this folder, after the Android module is installed:

```powershell
.\build-quest-jarvis.ps1
```

The signed debug APK is `Builds/QuestJarvis-debug.apk`. The debug keystore and `Signing/keystore.pass` stay on this PC so later updates keep the same signature. Neither is committed.
