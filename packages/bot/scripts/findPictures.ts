// Ported from the old root src/indexPictures.js — same Google Images scraping
// approach via puppeteer, kept as the working solution for creature thumbnails
// (see the migration plan for why: not yet clear an LLM agent can find these
// URLs economically). Run manually/occasionally, not part of the bot process.
// Usage: npm run find-pictures [-- test <creatureName>]
import '../src/loadEnv';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { algoliasearch } from 'algoliasearch';

const PICTURE_DATA = path.join(__dirname, '..', 'data', 'picUrls.json');
const INDEX_NAME = 'bosstalk_sounds';

interface CreatureImage {
  img_url: string;
  wrong_pic_votes: number;
}

function loadPics(): Map<string, CreatureImage[]> {
  if (!fs.existsSync(PICTURE_DATA)) return new Map();
  const raw: [string, CreatureImage[]][] = JSON.parse(fs.readFileSync(PICTURE_DATA, 'utf8'));
  return new Map(raw);
}

function savePics(pics: Map<string, CreatureImage[]>): void {
  fs.writeFileSync(PICTURE_DATA, JSON.stringify([...pics]));
}

async function allCreatureNames(): Promise<string[]> {
  const client = algoliasearch(process.env.ALGOLIA_APP_ID!, process.env.ALGOLIA_SEARCH_API_KEY!);
  const names = new Set<string>();
  await client.browseObjects<{ creatureName: string }>({
    indexName: INDEX_NAME,
    browseParams: { attributesToRetrieve: ['creatureName'] },
    aggregator: (response) => {
      for (const hit of response.hits) names.add(hit.creatureName);
    },
  });
  return [...names];
}

async function run(): Promise<void> {
  const pics = loadPics();
  try {
    const creatureNames = await allCreatureNames();
    let skipReply = ['Skipped '];
    for (const creatureName of creatureNames) {
      if (pics.has(creatureName) && (pics.get(creatureName)?.length ?? 0) >= 1) {
        if (skipReply.length === 1) skipReply.push(`${creatureName} to `);
        if (skipReply.length > 1) skipReply[2] = creatureName;
        continue;
      }
      if (skipReply.length > 1) {
        console.log(skipReply.join(' '));
        skipReply = ['Skipped '];
      }
      await doPuppet(creatureName, false, pics);
    }
  } catch (error) {
    console.log('\n\nError!!');
    console.log('Throttled?? Waiting 45-50 seconds.');
    await new Promise((resolve) => setTimeout(resolve, rand(45000, 50000)));
    await run();
  }
}

async function doPuppet(creatureName: string, test: boolean, pics: Map<string, CreatureImage[]>): Promise<void> {
  const browser = test ? await puppeteer.launch({ headless: false, slowMo: 1000 }) : await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`\nSTART ${creatureName}`);
  const creaturesPics: CreatureImage[] = pics.get(creatureName) ?? [];
  pics.set(creatureName, creaturesPics);

  let response = await page.goto(`https://www.google.com/search?q=world+of+warcraft+${creatureName}&tbm=isch`, { timeout: 60000 });
  console.log(`Loaded search results for ${creatureName}`);
  while (response && response.status() !== 200) {
    console.log('Throttled! Waiting 45-50 seconds.');
    await new Promise((r) => setTimeout(r, rand(45000, 50000)));
    response = await page.goto(`https://www.google.com/search?q=world+of+warcraft+${creatureName}&tbm=isch`, { timeout: 60000 });
  }

  const IMAGE_SELECTOR = `#islrg img`;
  const BIG_IMAGE_SELECTOR = `#Sva75c > div.ZuT88e > div > div.dFMRD > div.pxAole > div.tvh9oe.BIB1wf > c-wiz > div.nIWXKc.JgfpDb > div.OUZ5W > div.zjoqD > div.qdnLaf.isv-id.b0vFpe > div > a > img`;

  let src = '';
  let imageElements = await page.$$(IMAGE_SELECTOR);
  imageElements = imageElements.slice(0, 5);
  console.log(`Grabbed  ${imageElements.length} image element handles.`);
  for (const ele of imageElements) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      await ele.click();
    } catch (error) {
      console.log('click error!');
      throw error;
    }
    await new Promise((r) => setTimeout(r, 1000));
    src = (await page.evaluate((sel) => document.querySelector(sel)?.getAttribute('src') ?? '', BIG_IMAGE_SELECTOR)) ?? '';
    if (!src) {
      console.log("src not found :(");
      continue;
    }
    if (!src.includes('.png') && !src.includes('.jpg')) {
      console.log('src is not png or jpg :(');
      continue;
    }
    console.log(`Found big img = ${src}`);
    creaturesPics.push({ img_url: src, wrong_pic_votes: 0 });
  }

  if (!test) savePics(pics);

  console.log('Waiting 1-2 seconds\n');
  await new Promise((r) => setTimeout(r, rand(500, 1000)));
  await browser.close();
  await new Promise((r) => setTimeout(r, rand(500, 1000)));
}

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

const args = process.argv.slice(2);
if (args.includes('test')) {
  console.log('TESTING MODE');
  const name = args[args.indexOf('test') + 1];
  doPuppet(name, true, loadPics());
} else {
  console.log('Starting full picture find...');
  run();
}
