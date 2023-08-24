#!/usr/bin/env node

const {expect} = require("chai");
const fs = require('fs-extra')
const path = require('path')
const _ = require("lodash")
const ethers = require('ethers');
const blockForRaffle = require("./input/block-for-shuffle.json");
const genesisMetadata = require("./input/genesis-reference-metadata.json");

// enum like we have in Solidity
const Rarity = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4
}

const basicRarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary"
]

const PartType = {
  HEAD: 0,
  TORSO: 1,
  LEGS: 2,
  ARMS: 3,
}

const partTypes = [
  "Head",
  "Torso",
  "Legs",
  "Arms"
]

const rangeSize = 40;
const factor = 7;
const addend = 19;

function convert(x) {
  const base = Math.floor((x - 1) / rangeSize);
  const diff = (base * rangeSize);
  x = x - diff;
  return diff + (((x - 1) * factor + addend) % rangeSize) + 1;
}

function revert(y) {
  // We use Euler's Theorem. It requires 'factor' and 'addend' to be coprime
  let base = Math.floor((y - 1) / rangeSize);
  const diff = (base * rangeSize);
  y = y - diff;
  let factorInverse = 1;
  for (let i = 1; i <= rangeSize; i++) {
    if ((factor * i) % rangeSize === 1) {
      factorInverse = i;
      break;
    }
  }
  return diff + ((((y - 1 + rangeSize - addend) % rangeSize) * factorInverse) % rangeSize) + 1;
}

function getPartType(y) {
  const reverted = revert(y);
  const extra = (reverted - 1) % rangeSize;
  return Math.floor(extra / 10);
}

function transform(x) {
  const base = Math.floor((x - 1) / rangeSize);
  const diff = (base * rangeSize);
  x = x - diff;
  const cycleLength = 4;
  const tens = ((x - 1) % cycleLength) + 1;
  const ones = Math.floor((x - 1) / cycleLength) + 1;
  return diff + tens * 10 + ones - 10;
}

function reverseTransform(y) {
  const base = Math.floor(y / rangeSize) * rangeSize;
  const mod = ((y - 1) % rangeSize) + 10;
  const ones = Math.floor(mod / 10);
  const tens = mod % 10;
  let r = base + ones + (tens * 4);
  if (r % rangeSize === 0) {
    r -= rangeSize;
  }
  return r;
}

function countPartTypesByRarity(data) {
  let result = {}
  for (let row of data) {
    if (!result[row.Rarity]) {
      result[row.Rarity] = 0
    }
    result[row.Rarity]++;
  }
  return result
}

function countMetadataByRarityAndTypes(data) {
  let result = {}
  for (let row of data) {
    let rarity;
    let partType;
    for (let a of row.attributes) {
      if (a.trait_type === "Rarity") {
        rarity = a.value;
      } else if (a.trait_type === "Genesis Type") {
        partType = a.value;
      }
    }
    if (!result[rarity]) {
      result[rarity] = {}
    }
    if (!result[rarity][partType]) {
      result[rarity][partType] = 0
    }
    result[rarity][partType]++;
  }
  return result;
}

// variation of Fisher-Yates shuffle
function shuffleIndex(index) {
  let rand;
  for (let i = index.length - 1; i > 0; i--) {
    // we take only the latest 4 bytes of the hash
    // to make sure the number is not too big in JavaScript
    let hash = ethers.id(i + blockForRaffle.hash).substring(58, 66);
    let num = parseInt(hash, 16);
    rand = Math.floor(num % (i + 1));
    [index[i], index[rand]] = [index[rand], index[i]];
  }
  return index;
}


async function reorderParts() {

  const size = genesisMetadata.length;
  // counting the parts by rarity
  const distribution = countPartTypesByRarity(genesisMetadata)


  let commons = Array.from({length: distribution.Common / rangeSize}, () => "Common");
  let uncommons = Array.from({length: distribution.Uncommon / rangeSize}, () => "Uncommon");
  let rares = Array.from({length: distribution.Rare / rangeSize}, () => "Rare");
  let epics = Array.from({length: distribution.Epic / rangeSize}, () => "Epic");
  let legendaries = Array.from({length: distribution.Legendary / rangeSize}, () => "Legendary");

  const rarities = [...commons, ...uncommons, ...rares, ...epics, ...legendaries];
  // console.debug(JSON.stringify(rarities))

  const shuffledRarities = shuffleIndex(rarities);
  await fs.writeFile(path.resolve(__dirname, "tmp/shuffled-rarities.json"), JSON.stringify(shuffledRarities))
  let numericShuffledRarities = [shuffledRarities.map(e => basicRarities.indexOf(e)).slice(0, 77), shuffledRarities.map(e => basicRarities.indexOf(e)).slice(77)];
  await fs.writeFile(path.resolve(__dirname, "tmp/numeric-shuffled-rarities.json"), JSON.stringify(numericShuffledRarities))


  // let's double check that we have the same number of parts for each rarity
  const counts = {}
  for (let i = 0; i < shuffledRarities.length; i++) {
    if (!counts[shuffledRarities[i]]) {
      counts[shuffledRarities[i]] = 0
    }
    counts[shuffledRarities[i]]++;
  }
  // console.debug(counts)
  expect(counts.Common).to.equal(distribution.Common / rangeSize)
  expect(counts.Uncommon).to.equal(distribution.Uncommon / rangeSize)
  expect(counts.Rare).to.equal(distribution.Rare / rangeSize)
  expect(counts.Epic).to.equal(distribution.Epic / rangeSize)
  expect(counts.Legendary).to.equal(distribution.Legendary / rangeSize)

  console.debug("RarityIndex", JSON.stringify(shuffledRarities.map(e => basicRarities.indexOf(e))))

  // indices
  const metadataIndex = Array.from({length: size}, (_, i) => i);
  const metadataShuffledIndex = shuffleIndex(metadataIndex);
  const intermediateData = [];
  for (let i = 0; i < metadataShuffledIndex.length; i++) {
    intermediateData[metadataShuffledIndex[i]] = genesisMetadata[i];
  }

  await fs.writeFile(path.resolve(__dirname, "tmp/intermediata-data.json"), JSON.stringify(intermediateData, null, 2))

  const bodyPartsByRarity = {}
  for (let i = 0; i < intermediateData.length; i++) {
    const row = intermediateData[i];
    let rarity = row.Rarity;
    let partType = row["Genesis Type"];
    if (!bodyPartsByRarity[rarity]) {
      bodyPartsByRarity[rarity] = {}
    }
    if (!bodyPartsByRarity[rarity][partType]) {
      bodyPartsByRarity[rarity][partType] = []
    }
    bodyPartsByRarity[rarity][partType].push(row)
  }
  // console.debug(bodyPartsByRarity)

  await fs.writeFile(path.resolve(__dirname, "tmp/body-parts-by-rarity.json"), JSON.stringify(bodyPartsByRarity, null, 2))

  const nextIndexByRarityAndPartType = {}
  for (let i = 0; i < 5; i++) {
    // console.log(basicRarities[i])
    nextIndexByRarityAndPartType[basicRarities[i]] = [0, 0, 0, 0];
  }

  // console.debug(nextIndexByRarityAndPartType);

  function formatMeta(row) {
    // console.log(row)
    let meta = {
      name: `BYTE CITY Genesis # ${row.Rarity} ${row["Genesis Type"]}`,
      "image": `https://assets-bytecity.s3.amazonaws.com/png/genesis_${row["Genesis Type"].toLowerCase()}_${row.Rarity.toLowerCase()}.png`,
      description: `A Genesis part with ${row.Rarity} rarity. Four complementary parts (Head, Torso, Arms and Legs) of the same rarity can be fused to generate an Oracle of that rarity.`,
      attributes: []
    }
    for (let trait in row) {
      meta.attributes.push({
        "trait_type": trait,
        "value": row[trait]
      })
    }
    return meta;
  }

  const check = {}
  const finalData = [];

  for (let i = 0; i < shuffledRarities.length; i++) {
    let rarity = shuffledRarities[i];
    for (let k = 0; k < 4; k++) {
      for (let j = 0; j < 10; j++) {
        let tokenId = finalData.length + 1;
        let nextIndex = nextIndexByRarityAndPartType[rarity][k];
        const row = bodyPartsByRarity[rarity][partTypes[k]][nextIndex];
        let meta = formatMeta(row);
        finalData.push(meta);
        nextIndexByRarityAndPartType[rarity][k]++;
      }
    }
  }

  // we reorder the data so that any block of 10 consecutive tokens is of the same part type

  for (let i = 1; i <= finalData.length; i++) {
    let meta = finalData[i - 1];
    meta.tokenId = convert(i);
    if (check[meta.tokenId]) {
      console.log("DUPLICATE", meta.tokenId, i);
    }
    check[meta.tokenId] = true;
    meta.name = meta.name.replace(/#/, `#${meta.tokenId}`);
  }

  finalData.sort((a, b) => {
    a = a.tokenId;
    b = b.tokenId;
    return a < b ? -1 : (a > b ? 1 : 0);
  })

  for (let d of finalData) {
    // console.log(d.tokenId, d.attributes[0].value)
  }

  // validate the results
  //
  let validation = countMetadataByRarityAndTypes(finalData)
  // console.debug(validation)
  let sortedValidation = {
    Common: validation.Common,
    Uncommon: validation.Uncommon,
    Rare: validation.Rare,
    Epic: validation.Epic,
    Legendary: validation.Legendary
  }
  commons = distribution.Common / 4;
  uncommons = distribution.Uncommon / 4;
  rares = distribution.Rare / 4;
  epics = distribution.Epic / 4;
  legendaries = distribution.Legendary / 4;
  const expected = {
    Common: {Head: commons, Torso: commons, Legs: commons, Arms: commons},
    Uncommon: {Head: uncommons, Torso: uncommons, Legs: uncommons, Arms: uncommons},
    Rare: {Head: rares, Torso: rares, Legs: rares, Arms: rares},
    Epic: {Head: epics, Torso: epics, Legs: epics, Arms: epics},
    Legendary: {Head: legendaries, Torso: legendaries, Legs: legendaries, Arms: legendaries}
  };
  // console.debug(expected)
  // console.debug(sortedValidation)
  expect(sortedValidation).to.deep.equal(expected);

  function getBodyPartFromTokenId(tokenId) {
    let remainder = tokenId % rangeSize;
    if (remainder === 0) remainder = rangeSize;
    const res = revert(remainder);
    // console.log(tokenId, res % 10)
    return partTypes[res % 10];
  }

  // verify that the process is reversible
  for (let i = 0; i < finalData.length; i++) {
    const row = finalData[i];
    let rarity;
    let partType;
    for (let a of row.attributes) {
      if (a.trait_type === "Rarity") {
        rarity = a.value;
      } else if (a.trait_type === "Genesis Type") {
        partType = a.value;
      }
    }
    expect(partType).to.equal(partTypes[getPartType(row.tokenId)]);
  }

  await fs.writeFile(path.resolve(__dirname, "result/final-data.json"), JSON.stringify(finalData, null, 2))

  console.info("All done!");

}


reorderParts()
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e)
      process.exit(1)
    })

