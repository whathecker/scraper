import config from './config';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

console.log('hey worker is running');

const searchTarget = config.MAIN_SEARCH_URL || 's';
const searchTerm = '신발';
const searchBarDomSelector = '#autocompleteWrapper input[name="query"]';
const searchButtonDomSelector = '#autocompleteWrapper a[_clickcode="search"]';
const totalCountDomSelector = '.subFilter_num__2x0jq';
const storeLinkDomSelector = '.basicList_mall__sbVax';
//const paginationDomSelector = '.pagination_btn_page__FuJaU';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(searchTarget, { waitUntil: 'networkidle2' });
  await page.setViewport({ width: 1440, height: 20000 });
  await page.type(searchBarDomSelector, searchTerm);
  await page.click(searchButtonDomSelector);

  page.waitForSelector(totalCountDomSelector).then(async () => {
    const dom = await page.content();
    const $ = cheerio.load(dom);

    // save this total count
    const listCounters = $(totalCountDomSelector).html();
    console.log(listCounters);

    page.waitForTimeout(8000).then(async () => {
      const dom = await page.content();
      const $l2 = cheerio.load(dom);
      const storeLinks = $l2(storeLinkDomSelector);

      console.log(storeLinks);
      //console.log(storeLinks.length);
      //console.log(storeLinks[0]);
      //console.log(storeLinks[storeLinks.length - 1].attribs);
      // TODO: grab the store name
    });
  });
})();
