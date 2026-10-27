# Word Hive dictionary

Word Hive bundles **80,715 English word forms** from the English Speller Database (ESDB, formerly SCOWL), at revision `1e5b7d3a72f47a71da5d28686c1dd4b397178485`.

Source: https://github.com/en-wl/wordlist

## Accepted words

- Standard American and British spellings, including both common British -ise and -ize forms.
- Plurals and inflected verbs when present in the source; no guessed word endings.
- Between 4 and 24 letters; every word must use the hive letters and include its center.
- Accents are converted to plain letters. Entries with apostrophes, hyphens, spaces, digits or punctuation are excluded.
- Proper names, abbreviations, word fragments, nonstandard entries and the source's offensive-1/offensive-2 categories are excluded. Only entirely lowercase source entries are retained before conversion to uppercase. Ordinary words that also serve as names, such as robin, remain valid.
- `dictionary-exclusions.json` applies an additional exact-word editorial filter for selected slurs missing source tags. It currently removes 20 otherwise eligible word forms; it is not an exhaustive editorial review.

This is a spelling dictionary, not an official NYT word list. Some uncommon and technical words remain. The full dictionary is bundled in the page and word validation requires no network request.

## Puzzle and progress update

All 45 hives have at least one dictionary pangram. Seven previous hives relied on names for their pangrams; one outer letter was changed in each, retaining their center letters and positions in the daily rotation:

| Puzzle index | Previous letters | Updated letters | Example pangram |
| --- | --- | --- | --- |
| 4 | EHIMRTW | DEHIRTW | WITHDREW |
| 5 | EHMPRUY | EFMPRUY | PERFUMERY |
| 6 | CEHINRW | CEGHINR | CHEERING |
| 13 | IKLNOSW | GILNOSW | SLOWING |
| 17 | AIKORSW | AKORSTW | ARTWORKS |
| 22 | CEHILMT | ACEILMT | CLIMATE |
| 42 | IKORSUW | KORSTUW | WORKOUTS |

Existing daily and practice records retain words that are in the new dictionary and still fit the corresponding hive. Scores, best scores and rank goals are recalculated. Before changed records are written, the original browser record is backed up once under `word-hive-v3-before-dictionary-2026-10`. This backup is not overwritten by subsequent visits. If creating the backup fails, the update does not overwrite the original record. Progress remains specific to the browser and device.

## Reproduce the dictionary

With Python 3, git, and the ESDB build prerequisites installed:

```sh
git clone https://github.com/en-wl/wordlist.git
cd wordlist
git checkout 1e5b7d3a72f47a71da5d28686c1dd4b397178485
make
cd ..
python3 /path/to/word-hive/build-dictionary.py /path/to/wordlist
```

The builder pins the source commit, selects size 60 with American/British dialects and variant level 1, applies the documented category and lowercase filters, and writes the inline dictionary, license, and `dictionary-audit.json`. The audit records the exact command, word-list checksum, editorial exclusions, word counts and pangrams for every hive. Run `npm test` after rebuilding.

The source permission notice is included in [DICTIONARY-LICENSE.txt](DICTIONARY-LICENSE.txt) and inside the self-contained game HTML.
