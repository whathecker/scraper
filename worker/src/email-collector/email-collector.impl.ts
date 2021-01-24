/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-catch*/
import config from '../config';
import { TargetStore, CollectedStoreInfo } from '../definitions/core';
import { IEmailCollector } from '../definitions/email-collector';
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';

const searchTarget = config.MAIN_SEARCH_URL || 's';
const searchTerm = '블루투스이어폰';

const searchBarDomSelector = '#autocompleteWrapper input[name="query"]';
const searchButtonDomSelector = '#autocompleteWrapper a[_clickcode="search"]';
const totalCountDomSelector = '.subFilter_num__2x0jq';

const storeNameLinkDomSelector = '.basicList_mall__sbVax';
const storeDetailDomName = 'common_btn_detail__1Fu0c';
const paginationDomSelector = '.pagination_num__-IkyP a';

const storeDetailTableSelector = '._3fpUfPAXM5';
const emailDomSelector = '._2bY0n46Os8';

type Cheerio = typeof cheerio;
type Puppeteer = typeof puppeteer;

class EmailCollector implements IEmailCollector {
  private puppeteer: Puppeteer;
  private cheerio: Cheerio;
  private remainingStoreCount: number;
  private paginationView: number;
  private collectedStores: CollectedStoreInfo[];
  private searchTerm: string;

  constructor(puppeteer: Puppeteer, cheerio: Cheerio) {
    this.puppeteer = puppeteer;
    this.cheerio = cheerio;
    this.remainingStoreCount = 0;
    this.paginationView = 40;
    this.collectedStores = [];
    this.searchTerm = '';
    // TODO: add collectedStore unchanged count, if exceed certain threshold, terminate the process
  }

  execute(): void {
    this.startCollectionProcess(searchTerm);
  }

  private async startCollectionProcess(searchTerm: string) {
    console.log('hey worker is running');
    this.searchTerm = searchTerm;

    const browser = await this.puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(searchTarget, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1024, height: 999999 });

    const searchResultPage = await this.performSearch(
      searchBarDomSelector,
      searchButtonDomSelector,
      this.searchTerm,
      page,
    );
    const totalStoreCount = await this.getTotalResultCount(searchResultPage, totalCountDomSelector);
    //TODO: save totalStoreCount in Redis

    this.remainingStoreCount = totalStoreCount;

    while (this.remainingStoreCount >= 0) {
      console.log(`remaining stores ${this.remainingStoreCount - this.paginationView}`);

      const storesLinksFromResult = await this.getStoreLinksFromResult(searchResultPage, storeNameLinkDomSelector);
      const targetStores = this.filterTargetStores(storesLinksFromResult, storeDetailDomName);
      await this.scrapeTargetStoreFromResults(targetStores, storeDetailTableSelector, emailDomSelector);

      this.remainingStoreCount -= this.paginationView;
      await searchResultPage.click(paginationDomSelector);
    }
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
    return searchResultPage.waitForTimeout(500).then(async () => {
      const dom = await searchResultPage.content();
      const $searchResult = this.cheerio.load(dom);
      const storeLinks = $searchResult(storeLinkSelector);

      return Promise.resolve(storeLinks);
    });
  }

  private filterTargetStores(stores: Record<string, any>[], storeDetailSelector: string): TargetStore[] {
    const result = [];

    for (let i = 0; i < stores.length; i++) {
      const nextElement = stores[i].next as Record<string, any>;

      if (nextElement) {
        const nextNodeAttributes = nextElement.attribs;

        if (nextNodeAttributes.type === 'button' && nextNodeAttributes.class === storeDetailSelector) {
          const store = stores[i] as Record<string, any>;

          const wrapperNode = store.parent.parent.parent;
          const nodeWithLinkToProduct = wrapperNode.children[1].children[0].children[0];

          const storeName = store.children[0].data;
          const storeLink = nodeWithLinkToProduct.attribs.href;

          if (storeName && storeLink) {
            const targetStore: TargetStore = { storeName: storeName, storeLink: storeLink };
            result.push(targetStore);
          }
        }
      }
    }

    return result;
  }

  private async scrapeTargetStoreFromResults(
    stores: TargetStore[],
    storeDetailSelector: string,
    emailSelector: string,
  ): Promise<void> {
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const storeLink = store.storeLink;
      const storeName = store.storeName;

      const result = this.isStoreDuplicate(storeName);

      if (!result) {
        try {
          const secondBrowser = await this.puppeteer.launch();
          const storeDetailPage = await secondBrowser.newPage();

          await storeDetailPage.goto(storeLink, { waitUntil: 'networkidle2' });
          await storeDetailPage.setViewport({ width: 1024, height: 999999 });

          const html = await storeDetailPage.content();
          const dom = this.cheerio.load(html);
          const storeInfos = dom(storeDetailSelector);

          if (storeInfos.length > 0) {
            const storeDetail = this.getStoreDetail(dom, store, storeDetailSelector, emailSelector);
            this.collectedStores.push(storeDetail);
            console.log(this.collectedStores);
            console.log(this.collectedStores.length);
            // save store detail here
          }
          await secondBrowser.close();
        } catch (e) {
          throw e;
        }
      }
    }
  }

  private isStoreDuplicate(storeName: string): boolean {
    const result = this.collectedStores.find((e) => e.storeName === storeName);
    if (result) return true;
    return false;
  }

  private getStoreDetail(
    cheerioDom: any,
    store: TargetStore,
    storeDetailSelector: string,
    emailSelector: string,
  ): CollectedStoreInfo {
    const storeDetail: CollectedStoreInfo = {
      storeName: store.storeName,
      storeLink: store.storeLink,
      email: '',
      searchTerm: this.searchTerm,
      storeOwner: '',
      businessRegNum: '',
      ecomRegNum: '',
      address: '',
    };

    cheerioDom(storeDetailSelector).each((index: number, element: Record<string, any>) => {
      const dataElement = element.children[0] as Record<string, any>;
      index === 1 ? (storeDetail.storeOwner = dataElement.data) : null;
      index === 2 ? (storeDetail.businessRegNum = dataElement.data) : null;
      index === 3 ? (storeDetail.ecomRegNum = dataElement.data) : null;
      index === 4 ? (storeDetail.address = dataElement.data) : null;
      storeDetail.email = cheerioDom(emailSelector).html() as string;
    });

    return storeDetail;
  }
}

const emailCollector = new EmailCollector(puppeteer, cheerio);

emailCollector.execute();
