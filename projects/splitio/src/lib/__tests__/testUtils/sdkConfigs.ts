export const localhostConfig: SplitIO.IClientSideSettings = {
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
};

export const config: SplitIO.IClientSideSettings = {
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
