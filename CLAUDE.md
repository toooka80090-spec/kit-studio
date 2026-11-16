
## Sound effects library (VAMOS)
- 77 SFX in `sfx/library/<category>/`, catalogued in `sfx/catalog.json` with each sound's hit point; guide in `sfx/README.md` (Arabic).
- Use `tools/sfx.py` (`Mixer(duration).add(id, at=seconds)`) so the hit lands exactly on the cut / drop / logo; sounds are levelled to -16 LUFS first.
- Prefer these real SFX over synthesized ones in new videos. WAVs were converted losslessly to FLAC; `sfx/_raw/` (the unzipped originals) is local only and gitignored.
