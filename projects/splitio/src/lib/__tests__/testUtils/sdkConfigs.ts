import { LocalhostFromObject } from "@splitsoftware/splitio-browserjs";

export const localhostConfig: SplitIO.IBrowserSettings = {
  core: {
    authorizationKey: 'localhost',
    key: 'myKey'
  },
  features: {
    test_split: 'on',
    test_split2: {
      treatment: 'off',
      config: '{"bannerText":"Click here."}'
    }
  },
  scheduler: {
    offlineRefreshRate: 0.1
  },
  startup: {
    readyTimeout: 8
  },
  sync: {
    localhostMode: LocalhostFromObject()
  }
};

export const config: SplitIO.IBrowserSettings = {
  core: {
    authorizationKey: '<fake-token>',
    key:'myKey'
  },
  urls: {
    sdk: 'https://sdk.baseurl/readyFromCache_5',
    events: 'https://events.baseurl/readyFromCache_5'
  },
  startup: {
    readyTimeout: 0.001
  }
};
