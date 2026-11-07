# Google Play store listings · بيانات المتجر

Ready-to-upload listing text in the folder layout used by **fastlane supply**
(`<app>/<locale>/title.txt`, `short_description.txt`, `full_description.txt`).
Locales: `en-US` (global) and `ar` (Arabic, all Arab countries).

| App | Folder | Suggested package id |
|---|---|---|
| Dominoes (one app, 4 modes) | `dominoes/` | `com.triptimings.dominoes` |
| Trip Timings Games (all games) | `games-hub/` | `com.triptimings.games` |

Play Console limits (checked): title ≤ 30, short description ≤ 80, full description ≤ 4000 characters.

Upload manually (Play Console → Grow → Store presence → Main store listing, add the Arabic translation),
or with fastlane: copy a folder to `fastlane/metadata/android/` and run `fastlane supply --skip_upload_apk --skip_upload_aab`.

## Target keywords (ASO research)

Google Play has no keyword field: it ranks on the title, short and full description. These are the
terms the texts above are written around. Do **not** paste them as a list into the description:
Google's metadata policy treats keyword lists as spam.

**English (high volume → long tail):** dominoes, domino game, dominoes offline, dominos classic,
draw dominoes, block dominoes, all fives dominoes, muggins, partner dominoes, arabic dominoes, board games offline, tile games.

**Arabic:** دومينو، لعبة دومينو، دومينو عربي، دومينو مصري، دومينو شراكة، دومينو بدون نت،
دومينو أونلاين، دومينو سحب، دومينو بلوك، خمسات، ألعاب قهوة، ألعاب بدون نت.

## Before publishing
- Screenshots: phone 1080×1920 (at least 4) in both languages. Take them from the web build
  (`?lang=ar` / `?lang=en` forces a language).
- Feature graphic 1024×500, icon 512×512 (start from `site/games/dominoes/icon.svg`).
- Data safety form: the game stores progress on the device only; ads (AdMob) and Play Billing collect device identifiers.
- Content rating: the questionnaire answers are "no gambling with real money"; the wheel and points have no cash value.
