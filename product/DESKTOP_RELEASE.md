Mischief 0.11.1 updates the owner's modified portable app from release `334455667788`.

- Timer dragging keeps mouse capture outside the previous hit rectangle and saves a valid display position on the first drag. Lock/unlock stays usable across clock updates. Position survives restarting; reset returns the bar to the top.
- Background music uses the audio from the supplied **Mischief-Calm-Music-Preview (4).mp4**, bundled offline. Toggle it with the musical note on the timer, **Music** in the controls, or the tray menu. Adjust volume under **Focus timer → Background music**. Music starts off by default and loops when enabled. Music continues with the monkey, timer bar, or controls hidden; sleep pauses it until wake.
- Keeps the modified release's single-overlay renderer. Packaging verifies the original ZIP's SHA-256 and preserves every original file outside `resources/app.asar`, including FocusShield and native-pet helpers. Adds `TIMER_AND_MUSIC.txt` with instructions and audio credits.

Close the old app from its tray menu, extract the entire new ZIP into a fresh folder, and run **Buildlings.exe**. Saved sessions and preferences use the same app-data folder.

Windows checks cover native drag capture, repeated lock/unlock, synchronized pause/resume, offline music decoding and looping, settings persistence, simulated suspend/resume, underlying video playback, browser blocking, and the actual packaged app. Physical laptop sleep and GPU-driver behaviour still depend on the machine.
