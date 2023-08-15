# BYTE City Reveal

A set of tools to reveal the metadata of the body parts and later reveal the metadata of the oracles.

## Intro

Byte City Genesis tokens are body parts (head, torso, arms, legs).

Byte City Oracle tokens are robots built using one head, one torso, one arms and one legs of the same rarity (Common, Uncommon, Rare, Epic, Legendary).

## The flow

### Stage #1

1. Put the reference body parts metadata in **input/genesis-reference-metadata.json**. 
2. Commit and push to GitHub

### Stage #2

When the genesis body parts have been distributed

1. Unveil the **shuffle.js** script 
2. Commit and push to GitHub

### Stage #3

1. Wait for the block minted closest to 12pm PST (if there are two at the same distance, let's say, one 2 seconds before 12pm and one 2 seconds later, we will take the first).
2. Put the block's hash in **input/block-for-shuffle.json**.
3. Launch **shuffle.js** to use the block's hash to generate **result/final-metadata.json** containing the final genesis' metadata.
4. Update the BCFactory smart contract with the final metadata. 
5. Commit and push to GitHub

## Status

Current Stage: 1

### Credits

Author: [Francesco Sullo](https://sullo.co)

(c) 2023 Superpower Labs Inc.

### License
MIT
