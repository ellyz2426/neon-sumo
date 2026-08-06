# Neon Sumo VR 🤼

A sumo wrestling ring-out arcade built with IWSDK (Immersive Web SDK) for WebXR.

**[Play Now →](https://ellyz2426.github.io/neon-sumo/)**

## Gameplay

Push, grab, dodge, and throw your opponents out of the sacred dohyo ring. Rise through 10 authentic sumo ranks from Jonokuchi to Yokozuna.

### Controls

| Action | Keyboard | VR Controller |
|--------|----------|---------------|
| Move | WASD / Arrows | Left Thumbstick |
| Push | Space | Right Trigger |
| Grab/Throw | E | Right Grip |
| Dodge | Shift | Left Trigger |
| Charge | Q (hold) | — |
| Henka (sidestep) | F | Left Grip |
| Harite (palm strike)* | R | — |
| Pause | Escape / P | — |

*Harite unlocks at Komusubi rank (rank 5+)

## Game Modes

- **Fight** — Single matches with opponent scouting and rank progression
- **Tournament** — 8-fighter bracket elimination
- **Survival** — Endless waves with escalating difficulty
- **Training** — Practice against a passive dummy

## Features

### Combat
- 6 attack types: push, grab, dodge, charge, henka sidestep, and harite palm strike
- Stamina management with low-stamina speed penalty
- Combo system with score multiplier
- 12 kimarite (winning techniques) based on action type
- Impact slow-motion on big hits and ring-outs

### Arena
- Authentic dohyo ring with tawara boundary, salt circle, and shikiri-sen starting lines
- Dojo environment with walls, ceiling, roof beams, and decorative banners
- 4 corner pillars with lanterns and rope canopy
- Gyoji (referee) NPC who tracks the action and waves his gunbai fan
- 3-row spectator stands with reactive crowd (bounce on impacts)
- Edge danger warning ring that glows when near the boundary

### Customization
- 4 arena color schemes: Dohyo Classic, Neon Arena, Cherry Blossom, Thunder
- 8 mawashi (belt) colors: Blue, Red, Gold, Purple, Green, White, Black, Pink
- 3 difficulty levels
- SFX and music toggles

### Audio
- Procedural taiko drum music at dynamic tempo (scales with tension)
- Shamisen melody lines and bass drone
- 5 procedural SFX types (push, grab, dodge, charge, ring-out)
- Crowd chanting with vowel-formant filtered noise
- Crowd roar on ring-outs

### Progression
- 10 sumo ranks from Jonokuchi to Yokozuna
- 12 named AI opponents with unique weight/speed/aggression/technique stats
- Rank-up celebration with golden particles
- Yokozuna entrance ceremony with tsuna rope display
- Win streak tracking and career stats with localStorage persistence
- Match history (last 10 matches with kimarite)
- Post-match analytics: attacks used, combos, time, danger status

### Special Events
- Tachiai pre-match ceremony with salt throw and crouch animation
- Zabuton cushion throw on upset victories (beating heavy opponents)
- Confetti celebration on wins
- Sand spray particles on impacts

## Tech Stack

- **IWSDK 0.5.1** (@iwsdk/core) — Meta's Immersive Web SDK
- **Three.js** (super-three) — 3D rendering
- **UIKitML** — Spatial UI panels (.uikitml)
- **Vite** — Build tooling
- **TypeScript** — Type-safe codebase

## Development

```bash
pnpm install
npx iwsdk dev    # Start dev server
npm run build    # Production build
```

## License

Built as part of the IWSDK daily build pipeline.
