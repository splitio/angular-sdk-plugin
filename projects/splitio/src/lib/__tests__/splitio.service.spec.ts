import { SplitioService } from '../splitio.service';
import { mockedSplitView } from './mocks/SplitView.mock';
import { config, localhostConfig } from './testUtils/sdkConfigs';

describe('SplitioService', () => {

  let service: SplitioService;

  beforeEach(() => {
    service = new SplitioService();
  });

  test('SDK Events TIMED OUT', (done) => {
    expect(service).toBeTruthy();
    service.init(config);
    service.sdkReadyTimeOut$.subscribe(() => {
      expect(service.isSDKReady).toEqual(false);
      done();
    });
  });

  test('SDK Events READY / UPDATE', (done) => {
    expect(service.isSDKReady).toEqual(false);
    service.init(localhostConfig);
    service.ready().then(() => {
      expect(service.isSDKReady).toEqual(true);
    });
    service.sdkUpdate$.subscribe(() => {
      expect(service.isSDKReady).toEqual(true);
      done();
    });
    service.sdkReady$.subscribe(() => {
      expect(service.isSDKReady).toEqual(true);

      // subscribed again to ensure that is called even if the event was already emitted
      // and to verify that we can subscribe more than once to the observable
      service.sdkReady$.subscribe(() => {
        // this callback modifies the factory features so the update event will emit and finish this test with done function
        service.getSDKFactory().settings.features = { test_split: 'off' };
      });
    });
  });

  test('Evaluations', (done) => {
    expect(service.isSDKReady).toEqual(false);
    service.init(localhostConfig).subscribe(() => {

      const logSpy = jest.spyOn(console, 'log');
      service.init(config).subscribe({
        next: () => { throw new Error('it should not reach here'); },
        error: () => {
          expect(logSpy).toHaveBeenCalledWith('[ERROR] There is another instance of the SDK.');
          expect(service.config).toEqual(localhostConfig);
        }
      });

      const mainClient = service.getSDKClient();
      if (!mainClient) throw new Error('mainClient should exists');
      expect(service.isSDKReady).toEqual(true);

      const clientSpy = {
        getTreatment: jest.spyOn(mainClient, 'getTreatment'),
        getTreatmentWithConfig: jest.spyOn(mainClient, 'getTreatmentWithConfig'),
        getTreatments: jest.spyOn(mainClient, 'getTreatments'),
        getTreatmentsWithConfig: jest.spyOn(mainClient, 'getTreatmentsWithConfig'),
      };

      service.getTreatment('test_split');
      expect(clientSpy.getTreatment).toHaveBeenCalledWith('test_split', undefined);
      service.getTreatmentWithConfig('test_split', {attr: true});
      expect(clientSpy.getTreatmentWithConfig).toHaveBeenCalledWith('test_split', {attr: true});
      service.getTreatments(['test_split','test_split2'], {attr: true});
      expect(clientSpy.getTreatments).toHaveBeenCalledWith(['test_split','test_split2'], {attr: true});
      service.getTreatmentsWithConfig(['test_split','test_split2']);
      expect(clientSpy.getTreatmentsWithConfig).toHaveBeenCalledWith(['test_split','test_split2'], undefined);

      const sharedClientKey = 'myKey2';
      // initialize shared client and wait for ready
      service.initClient(sharedClientKey).subscribe(() => {
        const client = service.getSDKClient(sharedClientKey);
        if (!client) throw new Error('client should exists');
        // spy on shared client
        const sharedClientSpy = {
          getTreatment: jest.spyOn(client, 'getTreatment'),
          getTreatmentWithConfig: jest.spyOn(client, 'getTreatmentWithConfig'),
          getTreatments: jest.spyOn(client, 'getTreatments'),
          getTreatmentsWithConfig: jest.spyOn(client, 'getTreatmentsWithConfig'),
        };

        service.initClient(sharedClientKey).subscribe({
          next: () => { throw new Error('it should not reach here'); },
          error: () => {
            expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + sharedClientKey + ' is already initialized.');
          }
        });

        // Plugin should use control client for nonExistents keys
        const nonexistentKey = 'myKey3';
        expect(service.getTreatment(nonexistentKey, 'test_split')).toEqual('control');
        expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + nonexistentKey + ' should be initialized first.');
        expect(sharedClientSpy.getTreatment).toHaveBeenCalledTimes(0);

        expect(service.getTreatmentWithConfig(nonexistentKey, 'test_split')).toEqual({ treatment: 'control', config: null });
        expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + nonexistentKey + ' should be initialized first.');
        expect(sharedClientSpy.getTreatment).toHaveBeenCalledTimes(0);

        expect(service.getTreatments(nonexistentKey, ['test_split', 'test_split2']))
        .toEqual({
          test_split: 'control',
          test_split2: 'control'
        });
        expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + nonexistentKey + ' should be initialized first.');
        expect(sharedClientSpy.getTreatmentWithConfig).toHaveBeenCalledTimes(0);

        expect(service.getTreatmentsWithConfig(nonexistentKey, ['test_split', 'test_split2']))
        .toEqual({
          test_split: { treatment: 'control', config: null },
          test_split2: { treatment: 'control', config: null }
        });
        expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + nonexistentKey + ' should be initialized first.');
        expect(sharedClientSpy.getTreatmentsWithConfig).toHaveBeenCalledTimes(0);

        // verify that main client is not evaluating when evaluates for shared client
        expect(service.getTreatment(sharedClientKey, 'test_split', {attr: true})).toEqual('on');
        expect(sharedClientSpy.getTreatment).toHaveBeenCalledWith('test_split', {attr: true});
        expect(clientSpy.getTreatment).toHaveBeenCalledTimes(1);

        expect(service.getTreatmentWithConfig(sharedClientKey, 'test_split', {attr: true})).toEqual({treatment: 'on', config: null});
        expect(sharedClientSpy.getTreatmentWithConfig).toHaveBeenCalledWith('test_split', {attr: true});
        expect(clientSpy.getTreatmentWithConfig).toHaveBeenCalledTimes(1);

        expect(service.getTreatments(sharedClientKey, ['test_split','test_split2'], {attr: true}))
        .toEqual({
          'test_split': 'on',
          'test_split2': 'off'
        });
        expect(sharedClientSpy.getTreatments).toHaveBeenCalledWith(['test_split','test_split2'], {attr: true});
        expect(clientSpy.getTreatments).toHaveBeenCalledTimes(1);

        expect(service.getTreatmentsWithConfig(sharedClientKey, ['test_split','test_split2'], {attr: true}))
        .toEqual({
          test_split: { treatment: 'on', config: null },
          test_split2: { treatment: 'off', config: '{"bannerText":"Click here."}' }
        });
        expect(sharedClientSpy.getTreatmentsWithConfig).toHaveBeenCalledWith(['test_split','test_split2'], {attr: true});
        expect(clientSpy.getTreatmentsWithConfig).toHaveBeenCalledTimes(1);

        // input validation
        // @ts-ignore
        expect(service.getTreatmentWithConfig(null)).toEqual({ treatment: 'control', config: null });
        // @ts-ignore
        expect(service.getTreatmentWithConfig(undefined)).toEqual({ treatment: 'control', config: null });
        expect(service.getTreatmentWithConfig('non_existent_split')).toEqual({ treatment: 'control', config: null });
        // @ts-ignore
        expect(service.getTreatment(null)).toEqual('control');
        // @ts-ignore
        expect(service.getTreatment(undefined)).toEqual('control');
        expect(service.getTreatment('non_existent_split')).toEqual('control');
        done()
      });
    });
  });

  test('SDK Manager', (done) => {
    expect(service.getSplitNames()).toEqual([]);
    service.init(localhostConfig);
    service.sdkReady$.subscribe(() => {
      // @ts-ignore
      expect(service.getSplits()).toEqual(mockedSplitView);
      expect(service.getSplitNames()).toEqual(mockedSplitView.map(split => split.name))
      // @ts-ignore
      expect(service.getSplit('test_split2')).toEqual(mockedSplitView[1]);
      expect(service.getSplit('nonexistent_split')).toBeNull();
      done();
    });
  });
});
