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
const paginationDomSelector = '.pagination_num__-IkyP a';

interface IEmailCollector {
  execute(): void;
}

type TargetStore = {
  storeName: string;
  storeLink: string;
  email?: string;
  searchTerm?: string;
  phoneNumber?: string;
};

class EmailCollector implements IEmailCollector {
  private puppeteer: Puppeteer;
  private cheerio: Cheerio;
  private remainingStoreCount: number;
  private paginationView: number;
  private collectedStores: TargetStore[];

  constructor(puppeteer: Puppeteer, cheerio: Cheerio) {
    this.puppeteer = puppeteer;
    this.cheerio = cheerio;
    this.remainingStoreCount = 0;
    this.paginationView = 40;
    this.collectedStores = [];
    // TODO: add collectedStore unchanged count, if exceed certain threshold, terminate the process
  }

  execute(): void {
    this.startCollectionProcess();
  }

  private async startCollectionProcess() {
    const browser = await this.puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(searchTarget, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1024, height: 999999 });

    const searchResultPage = await this.performSearch(searchBarDomSelector, searchButtonDomSelector, searchTerm, page);

    const totalStoreCount = await this.getTotalResultCount(searchResultPage, totalCountDomSelector);
    //TODO: save totalStoreCount in Redis

    this.remainingStoreCount = totalStoreCount;

    while (this.remainingStoreCount >= 0) {
      console.log(`remaining stores ${this.remainingStoreCount - this.paginationView}`);
      //console.log(this.collectedStores);

      const storesLinksFromResult = await this.getStoreLinksFromResult(searchResultPage, storeLinkDomSelector);

      await this.scrapeTargetStoreFromResults(storesLinksFromResult, storeDetailDomName);

      this.remainingStoreCount -= this.paginationView;

      await searchResultPage.click(paginationDomSelector);
    }

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

  private async scrapeTargetStoreFromResults(
    stores: Record<string, any>[],
    storeDetailSelector: string,
  ): Promise<TargetStore[]> {
    for (let i = 0; i < stores.length; i++) {
      const targetStore = this.getTargetStore(stores[i], storeDetailSelector);

      if (targetStore) {
        console.log(targetStore);
        await this.getStoreDetailFromStorePage(targetStore);
        this.collectedStores.push(targetStore);
      }
    }

    return Promise.resolve(this.collectedStores);
  }

  private getTargetStore(store: Record<string, any>, storeDetailSelector: string): TargetStore | null {
    const nextElement = store.next as Record<string, any>;

    if (nextElement) {
      const nextNodeAttributes = nextElement.attribs;

      if (nextNodeAttributes.type === 'button' && nextNodeAttributes.class === storeDetailSelector) {
        const storeName = store.children[0].data;
        const storeLink = store.attribs.href;

        const isDuplicate = this.collectedStores.find((e) => e.storeName === storeName);
        const targetStore = { storeName: storeName, storeLink: storeLink };

        if (!isDuplicate) return targetStore;
      }
    }

    return null;
  }

  private async getStoreDetailFromStorePage(targetStore: TargetStore) {
    const secondBrowser = await this.puppeteer.launch({ headless: false });
    const storeDetailPage = await secondBrowser.newPage();
    await storeDetailPage.goto(targetStore.storeLink, { waitUntil: 'networkidle2' });
    await storeDetailPage.setViewport({ width: 1024, height: 999999 });

    storeDetailPage.waitForTimeout(3000).then(async () => {
      await secondBrowser.close();
    });
  }
}

const emailCollector = new EmailCollector(puppeteer, cheerio);

emailCollector.execute();
