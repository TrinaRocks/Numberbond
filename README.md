# 🎮 Number Bonds Games

Three browser-based maths games for KS1 and KS2 number bonds practice. Works as a Progressive Web App — install it on an iPad and play fully offline.

## Games

| Game | Stage | Description |
|------|-------|-------------|
| 🐙 Ocean Bonds | KS1–KS2 | Type the missing number. The octopus cheers you on! |
| ⚖️ Weighing Scales | KS1 | Place weights on the pan to balance the scales. |
| 🧪 Potion Shop | KS1–KS2 | Fill the wizard's cauldron with the right potions! |

## Features

- Named player profiles with local save data
- 7 difficulty levels (bonds to 5, to 10, to 20, doubles, etc.)
- Addition only, subtraction only, or mixed question types
- Optional counters / dot display alongside numbers
- Optional 10-second countdown timer
- Sound effects (Web Audio API)
- Fully offline after first load (PWA / service worker)

## Installing on iPad

1. Open the GitHub Pages URL in **Safari**
2. Tap the **Share** button → **Add to Home Screen**
3. Tap **Add** — it now appears as an app icon
4. Works fully offline from that point on

## Updating

After editing and committing files, bump the cache version in `sw.js`:

```js
const CACHE = 'numberbonds-v2';  // increment this each deploy
```

This ensures iPads pick up the latest version on next launch.

## Files

```
index.html              — launcher / player select screen
ocean_number_bonds.html — Ocean Bonds game
weighing_scales.html    — Weighing Scales game
potion_shop.html        — Potion Shop game
bond_engine.js          — shared bond generation logic
manifest.json           — PWA manifest
sw.js                   — service worker (offline caching)
icon-192.png            — app icon
icon-512.png            — app icon (large)
```

## Privacy

All data (player profiles, scores) is stored only in the browser's `localStorage` on the device. Nothing is sent to any server.
