# BYTE City Reveal

A set of tools to reveal the metadata of the body parts and later reveal the metadata of the oracles.

## Intro

Byte City Genesis tokens are body parts (head, torso, arms, legs).

Byte City Oracle tokens are robots built using one head, one torso, one arms and one legs of the same rarity (Common, Uncommon, Rare, Epic, Legendary).

## The flow

### Stage 1 - Reference Metadata

- Add reference body part metadata to `input/genesis-reference-metadata.json`
- Commit and push to GitHub

On August 23rd at 6am PST starts the minting. 

- For the first 4 hours, only guaranteed allowlist wallets can mint.
- For the next 4 hours, any allowlist wallets can mint.
- After 8 hours, minting opens to everyone.

### Stage 2 - Reveal Shuffle Script
After genesis body parts are distributed:

- Unveil `shuffle.js` script 
- Commit and push to GitHub

### Stage 3 - Final Metadata
On August 25th at 9am PST:

- Note block hash mined closest to 9am PST (use first if two are equidistant)
- Add block hash to `input/block-for-shuffle.json`
- Run shuffle.js to generate `result/final-metadata.json`
- Commit and push to GitHub

The metadata will then be rapidly propagated to the API and factory contract.
 

## Status

Current Stage: 1

### Credits

Author: [Francesco Sullo](https://sullo.co)

(c) 2023 Superpower Labs Inc.

### License
MIT
