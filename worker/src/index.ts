/* eslint-disable @typescript-eslint/no-explicit-any */
import config from './config';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

type Cheerio = typeof cheerio;
type Puppeteer = typeof puppeteer;

console.log('hey worker is running');

const searchTarget = config.MAIN_SEARCH_URL || 's';
const searchTerm = '신발';
const searchBarDomSelector = '#autocompleteWrapper input[name="query"]';
const searchButtonDomSelector = '#autocompleteWrapper a[_clickcode="search"]';
const totalCountDomSelector = '.subFilter_num__2x0jq';
const storeLinkDomSelector = '.basicList_mall__sbVax';
const storeDetailDomName = 'common_btn_detail__1Fu0c';
//const paginationDomSelector = '.pagination_btn_page__FuJaU';

interface IEmailCollector {
  execute(): void;
}

class EmailCollector implements IEmailCollector {
  private puppeteer: Puppeteer;
  private cheerio: Cheerio;

  constructor(puppeteer: Puppeteer, cheerio: Cheerio) {
    this.puppeteer = puppeteer;
    this.cheerio = cheerio;
  }

  execute(): void {
    this.startCollectionProcess();
  }

  private async startCollectionProcess() {
    const browser = await this.puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(searchTarget, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1440, height: 90000 });

    const searchResultPage = await this.performSearch(searchBarDomSelector, searchButtonDomSelector, searchTerm, page);

    const totalResultCount = await this.getTotalResultCount(searchResultPage, totalCountDomSelector);

    console.log(totalResultCount);

    const storesLinksFromResult = await this.getStoreLinksFromResult(searchResultPage, storeLinkDomSelector);

    console.log(storesLinksFromResult);

    const targetStores = this.filterTargetStores(storesLinksFromResult, storeDetailDomName);
    console.log(targetStores);
    // save targetStores in DB
  }

  private async performSearch(searchBarSelector: string, searchBtnSelector: string, keyword: string, page: any) {
    await page.type(searchBarSelector, keyword);
    await page.click(searchBtnSelector);
    return page;
  }

  private async getTotalResultCount(searchResultPage: any, totalCountSelector: string): Promise<number> {
    return searchResultPage.waitForSelector(totalCountSelector).then(async () => {
      const html = await searchResultPage.content();
      const dom = this.cheerio.load(html);
      const totalSearchResultCount = dom(totalCountDomSelector).html() as string;

      return Promise.resolve(this.convertCountToInteger(totalSearchResultCount));
    });
  }

  private convertCountToInteger(count: string): number {
    return parseInt(count.replace(/,/g, ''));
  }

  private async getStoreLinksFromResult(
    searchResultPage: any,
    storeLinkSelector: string,
  ): Promise<Record<string, any>[]> {
    return searchResultPage.waitForTimeout(2000).then(async () => {
      const dom = await searchResultPage.content();
      const $searchResult = this.cheerio.load(dom);
      const storeLinks = $searchResult(storeLinkSelector);

      return Promise.resolve(storeLinks);
    });
  }

  private filterTargetStores(stores: Record<string, any>[], storeDetailSelector: string): Record<string, any>[] {
    const result = [];

    for (let i = 0; i < stores.length; i++) {
      const nextElement = stores[i].next as Record<string, any>;

      if (nextElement) {
        const nextNodeAttributes = nextElement.attribs;

        if (nextNodeAttributes.type === 'button' && nextNodeAttributes.class === storeDetailSelector) {
          const store = stores[i] as Record<string, any>;
          const storeName = store.children[0].data;
          const storeLink = store.attribs.href;

          result.push({ storeName: storeName, storeLink: storeLink });
        }
      }
    }

    return result;
  }
}

const emailCollector = new EmailCollector(puppeteer, cheerio);

emailCollector.execute();
