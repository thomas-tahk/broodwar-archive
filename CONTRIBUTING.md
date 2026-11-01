# Contributing

No coding or git needed. You only need a free GitHub account.

You can also just [open an issue](../../issues/new/choose) and we'll do the edit for you.

## Add a copy you found

1. Go to the match file on github.com: `catalog/matches/<event>/<match>.yaml`.
2. Click the **pencil** icon (Edit this file), top right of the file.
3. Find the game you have a copy of (`set: 1`, `set: 2`, ...). Look at its `copies:` line.
4. If it says `copies: []`, change it to just `copies:` (delete the `[]`).
5. Paste this block on the line(s) right under `copies:`. Keep the spaces at the start of each line exactly as shown:

```yaml
      - url: https://example.com/your-link   # required
        kind: fan-upload                     # ogn-official | ogn-ai-upscale | fan-upload | torrent | other
        title: null
        uploader: null
        resolution: 480p                     # or null
        fps: 30                              # or null
        grade: null                          # A | B | C | D | null (not graded yet)
        grade_note: null                     # why this grade
        segment: null                        # or {start: "00:47:10", end: "01:11:00"}
```

6. Replace the example values. Anything you don't know stays `null`.
7. If the game already has copies, paste your block after the last one, same indentation.
8. Click **Commit changes...**, then **Propose changes**, then **Create pull request** (twice if asked).
9. Wait a minute. An automatic check (the validator) runs. A green tick means it passed. A red cross means something is wrong: click **Details** and it says what and where. Fix it by clicking the pencil again on your changed file.

## Fix wrong info

1. Open the file with the wrong info on github.com (a match under `catalog/matches/`, or a player/map/event).
2. Click the **pencil** (Edit).
3. Change the value. Don't know the right value? Use `null`.
4. Add your source: under `sources:` add a line like this, lined up with the others:

```yaml
  - url: https://example.com/where-you-saw-it
    note: what it says
```

5. **Commit changes...**, **Propose changes**, **Create pull request**.
6. Read the automatic check result (see step 9 above).

Not comfortable editing? Use an [issue form](../../issues/new/choose) instead.

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
