# Contributing

No coding or git needed. You only need a free GitHub account.

You can also just [open an issue](https://github.com/thomas-tahk/broodwar-archive/issues/new/choose) and we'll do the edit for you.

## Add a copy you found

1. Go to the match file on github.com: `catalog/matches/<event>/<match>.yaml`.
2. Click the **pencil** icon (Edit this file), top right of the file. If GitHub shows a **Fork this repository** prompt, accept it. It's normal.
3. Find the game you have a copy of (`set: 1`, `set: 2`, ...). Look at its `copies:` line.
4. If it says `copies: []`, change it to just `copies:`. Delete the `[]`, or the check will fail with "block sequence ... implicit map key".
5. Click at the start of the empty line under `copies:`. Delete any spaces GitHub added, so the cursor is at the very start of the line. Paste this block. Keep the spaces at the start of each line exactly as shown:

```yaml
      - url: https://example.com/your-link   # required
        kind: fan-upload                     # ogn-official | ogn-ai-upscale | fan-upload | torrent | other. Not sure? other
        title: null
        uploader: null
        resolution: null                     # e.g. 480p
        fps: null                            # e.g. 30
        grade: null                          # A | B | C | D | null (not graded yet)
        grade_note: null                     # why this grade
        segment: null                        # or {start: "00:47:10", end: "01:11:00"}
```

6. Replace the example values. Anything you don't know stays `null` (except `kind`, which can't be null).
7. If the game already has copies, paste your block after the last one, same indentation.
8. One upload that holds several games? Add it once per game, each with its own `segment`.
9. Click **Commit changes...**, then **Propose changes**, then **Create pull request** (twice if asked).
10. Wait a minute. An automatic check (the validator) runs. Green tick = passed. Red cross = something is wrong: click **Details** and it says what and where. On a first contribution the check may wait for a maintainer to approve it. That's normal.
11. To fix it: open your pull request, click **Files changed**, click the **...** on your file, **Edit file**, fix, and commit again.

## Fix wrong info

1. Open the file with the wrong info on github.com (a match under `catalog/matches/`, or a player/map/event).
2. Click the **pencil** (Edit).
3. Change the value. Don't know the right value? Use `null`.
4. If your source backs the whole file, add it to `sources:`. Look at the `sources:` of the file:
   - Multi-line list: add a line, lined up with the others:
     ```yaml
       - url: https://example.com/where-you-saw-it
         note: what it says
     ```
   - One line like `sources: [{url: https://a.com}]`: add inside the brackets: `sources: [{url: https://a.com}, {url: https://example.com/new, note: what it says}]`
5. Otherwise (your source backs only the value you changed), skip step 4 and name it under `field_sources:` (add that key at the bottom if missing), field name then link:
   ```yaml
   field_sources:
     date: https://example.com/where-you-saw-it
   ```
6. **Commit changes...**, **Propose changes**, **Create pull request**.
7. Read the automatic check result (see steps 10 and 11 above).

Not comfortable editing? Use an [issue form](https://github.com/thomas-tahk/broodwar-archive/issues/new/choose) instead.

## Rules

- **Every fact needs a source link.**
- **Unknown = `null`. Never guess.**
- **Never upload video.** Links only.

## Grades

| Grade | Meaning |
|---|---|
| A | near-source |
| B | clean re-encode |
| C | degraded but complete |
| D | partial or badly damaged |
| X | known lost (`lost: true` on the game; needs a source) |

A game is a **gap** when it has no copy graded A to C.

Full file format: [docs/catalog-format.md](docs/catalog-format.md).
