# Piano Chord Library

A simple local-first web app for saving songs with piano chords above lyrics and transposing them up or down by semitone.

## What it does

- Saves songs in your browser with `localStorage`
- Lets you paste chord sheets directly into a textarea
- Keeps track of the song's `originalKey`
- Stores the currently saved transposed position separately as `savedTranspose`
- Stores the resulting transposed key separately as `savedKey`
- Transposes common chord formats such as `C`, `Bb`, `F#m7`, `Gsus4`, and slash chords like `D/F#`

## How to use it

1. Open [`index.html`](/Users/rohanmenon/Documents/New project/index.html) in your browser.
2. Click `New Song`.
3. Enter the title, artist, original key, and paste the chord/lyric sheet.
4. Click `Save Song`.
5. Use the transpose buttons in the preview panel to move the chords up or down.

## Notes

- Songs are stored only in the current browser on the current device.
- The original pasted sheet is preserved exactly as entered.
- The transposed version is generated for preview from the saved transpose amount.

## Example format

```text
C        G/B      Am
Amazing grace, how sweet the sound

F        C/E      Dm7   G
That saved a wretch like me
```
