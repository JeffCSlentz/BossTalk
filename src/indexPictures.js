const puppeteer = require('puppeteer');
const fs = require('fs');
const Discord = require('discord.js');
const {readDiscordCollection, writeDiscordCollection} = require('./data');
const logger = require('./logger');
const { truncate } = require('fs/promises');
const PICTURE_DATA = `./data/picUrls.json`;

/**
 * @todo rerun picture finding for creatures with "generic" in their name.
 */
async function run () {

    try {
        const creatureFiles = fs.readdirSync(`./sounds/creature/`);
        const pics = readDiscordCollection(PICTURE_DATA);
        let skipReply = ['Skipped '];
        for( const creatureName of creatureFiles ){
            
            if(pics.has(creatureName) && pics.get(creatureName).length >= 1){
                if(skipReply.length == 1) skipReply.push(`${creatureName} to `);
                if(skipReply.length > 1) skipReply[2] = creatureName;
                continue;
            }
            if(skipReply.length > 1) {console.log(skipReply.join(' '));skipReply=['Skipped '];}
            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();
    
            console.log(`\nSTART ${creatureName}`)
            let creaturesPics = [];
            if (pics.has(creatureName)){
                creaturesPics = pics.get(creatureName);
            } else {
                pics.set(creatureName, creaturesPics);
            }
    
    
            let response = await page.goto(`https://www.google.com/search?q=world+of+warcraft+${creatureName}&tbm=isch`, {timeout:60000});
            console.log(`Loaded search results for ${creatureName}`)
            while(response.status() != 200){
                console.log('Throttled! Waiting 45-50 seconds.');
                await page.waitForTimeout(rand(45000,50000));
                response = await page.goto(`https://www.google.com/search?q=world+of+warcraft+${creatureName}&tbm=isch`, {timeout:60000});
            }
            
            const IMAGE_SELECTOR = `#islrg img`; //grab this from wow image results if its broken
            const BIG_IMAGE_SELECTOR = `#Sva75c > div > div > div.pxAole > div.tvh9oe.BIB1wf > c-wiz > div > div.OUZ5W > div.zjoqD > div.qdnLaf.isv-id > div > a > img`;
            //let imageHrefs = await page.evaluate(grabSrcs, IMAGE_SELECTOR);
            //imageHrefs.forEach(d => creaturesPics.push({img_uri:d, wrong_pic_votes: 0}));
            
            let src = '';
            //let imageElements = await page.evaluate(grabElements, IMAGE_SELECTOR);
            let imageElements = await page.$$(IMAGE_SELECTOR)
            imageElements = imageElements.slice(0,5);
            console.log(`Grabbed  ${imageElements.length} image element handles.`)
            for(const ele of imageElements){
                await page.waitForTimeout(1000);
                
                try {
                    await ele.click();         
                } catch (error) {
                    console.log('click error!');
                    throw(error);
                }
                //await page.waitForNavigation();
                //await page.waitForSelector('#newElementThatAppeared');
                await page.waitForTimeout(1000);
                //await page.waitForFunction((BIG_IMAGE_SELECTOR, src) => document.querySelector(BIG_IMAGE_SELECTOR) != src, [BIG_IMAGE_SELECTOR, src]);
                src = await page.evaluate(grabBigPictureSrc, BIG_IMAGE_SELECTOR);
                if(!src) {console.log('src not found :(');continue;}
                if(!src.includes('.png') && !src.includes('.jpg')) {console.log('src is not png or jpg :(');continue;}
                console.log(`Found big img = ${src}`);
                creaturesPics.push({img_url:src, wrong_pic_votes: 0});
            }
    
            
            writeDiscordCollection(pics, PICTURE_DATA)
            
            console.log("Waiting 1-2 seconds\n");
            await new Promise(resolve => setTimeout(resolve,  rand(500,1000)));
            await browser.close();
            await new Promise(resolve => setTimeout(resolve,  rand(500,1000)));
    
        }   
    } catch (error) {
        console.log('\n\nError!!')
        console.log('Throttled?? Waiting 45-50 seconds.');
        await new Promise(resolve => setTimeout(resolve,  rand(45000,50000)));
        run();
    }
}

run();




function grabSrcs(IMAGE_SELECTOR){
    let docs = Array.from(document.querySelectorAll(IMAGE_SELECTOR));
    console.log(docs);
    let slice = docs.slice(0,5);
    return slice.map(x => x.getAttribute('src'))//.replace('/', '');
}

async function grabElements(IMAGE_SELECTOR){
    return document.querySelectorAll(IMAGE_SELECTOR);
}

async function grabBigPictureSrc(IMAGE_SELECTOR){
    let bigPic = document.querySelector(IMAGE_SELECTOR)
    console.log(bigPic);
    let src = bigPic?.getAttribute?.('src');
    return src
}

function rand(min, max){
    return min + Math.floor(Math.random()*(max-min));
}