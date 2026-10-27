# Word Hive — Polished Edition

Play at https://6597d8z58f-cell.github.io/word-hive/.

The site is a self-contained `index.html`, published by the existing GitHub Pages deployment from `main`.

- 45 puzzle configurations, selected deterministically by the player's local calendar date.
- Practice puzzles, return-to-daily navigation, and automatic daily rollover.
- 5,331 bundled dictionary entries, including 12 common omissions repaired during testing.
- Saved daily and practice progress in browser local storage, with malformed-record recovery.
- Four-letter words score 1 point; longer words score their length; pangrams add 7 points.
- Genius at 70% of available points; Queen Bee at 100%.
- Success and pangram animations, reduced-motion support, hints, stats, and score sharing.

The bundled lexicon is not an official NYT dictionary. It includes proper names and uncommon entries; dictionary membership is enforced, but the list needs further editorial curation. Daily configurations can repeat. Progress is specific to the browser and device and is unavailable when browser storage is blocked.

## Tests

```sh
npm install
npx playwright install chromium
npm test
BASE_URL=https://6597d8z58f-cell.github.io/word-hive/ npm test
```

The suite tests touch input, delete/shuffle, scoring, duplicate and invalid-word rejection, animations, reduced motion, local-midnight rollover, saved daily/practice progress, malformed and blocked storage, all puzzle structures, completion rank, and layouts at 320, 375, 390, 412 and 844 pixels. It runs isolated browser contexts and does not change any player's progress.

Tests use Chromium mobile emulation. Physical iPhone/Safari testing is separate. Optional `CHROMIUM_PATH`, `PLAYWRIGHT_MODULE`, and `SCREENSHOT_DIR` environment variables support custom test environments.
