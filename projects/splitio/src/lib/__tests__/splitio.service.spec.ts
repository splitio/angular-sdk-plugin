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
    service.SDKReadyTimeOut$.subscribe(() => {
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
    service.SDKUpdate$.subscribe(() => {
      expect(service.isSDKReady).toEqual(true);
      done();
    });
    service.SDKReady$.subscribe(() => {
      expect(service.isSDKReady).toEqual(true);

      // subscribed again to ensure that is called even if the event was already emitted
      // and to verify that we can subscribe more than once to the observable
      service.SDKReady$.subscribe(() => {
        // this callback modifies the factory features so the update event will emit and finish this test with done function
        service.getSDKFactory().settings.features = { test_split: 'off' };
      });
    });
  });

  test('Evaluations', (done) => {
    expect(service.isSDKReady).toEqual(false);
    service.initWaitForReady(localhostConfig).subscribe(() => {

      const logSpy = jest.spyOn(console, 'log');
      service.init(config);
      expect(logSpy).toHaveBeenCalledWith('[ERROR] There is another instance of the SDK.');
      expect(service.settings).toEqual(localhostConfig);

      const mainClient = service.getSDKClient();
      expect(service.isSDKReady).toEqual(true);
      const clientSpy = {
        getTreatment: jest.spyOn(mainClient, 'getTreatment'),
        getTreatmentWithConfig: jest.spyOn(mainClient, 'getTreatmentWithConfig'),
        getTreatments: jest.spyOn(mainClient, 'getTreatments'),
        getTreatmentsWithConfig: jest.spyOn(mainClient, 'getTreatmentsWithConfig'),
      };
      service.getTreatment('test_split');
      expect(clientSpy.getTreatment).toHaveBeenCalled();
      service.getTreatmentWithConfig('test_split');
      expect(clientSpy.getTreatmentWithConfig).toHaveBeenCalled();
      service.getTreatments(['test_split','test_split2']);
      expect(clientSpy.getTreatments).toHaveBeenCalled();
      service.getTreatmentsWithConfig(['test_split','test_split2']);
      expect(clientSpy.getTreatmentsWithConfig).toHaveBeenCalled();

      // initialize shared client and wait for ready
      service.initForKeyWaitForReady('myKey2').subscribe(client => {
        // spy on shared client
        const sharedClientSpy = {
          getTreatment: jest.spyOn(client, 'getTreatment'),
          getTreatmentWithConfig: jest.spyOn(client, 'getTreatmentWithConfig'),
          getTreatments: jest.spyOn(client, 'getTreatments'),
          getTreatmentsWithConfig: jest.spyOn(client, 'getTreatmentsWithConfig'),
        };

        // verify that main client is not evaluating when evaluates for shared client
        service.get('myKey2').getTreatment('test_split');
        expect(sharedClientSpy.getTreatment).toHaveBeenCalled();
        expect(clientSpy.getTreatment).toHaveBeenCalledTimes(1);
        service.get('myKey2').getTreatmentWithConfig('test_split');
        expect(sharedClientSpy.getTreatmentWithConfig).toHaveBeenCalled();
        expect(clientSpy.getTreatmentWithConfig).toHaveBeenCalledTimes(1);
        service.get('myKey2').getTreatments(['test_split','test_split2']);
        expect(sharedClientSpy.getTreatments).toHaveBeenCalled();
        expect(clientSpy.getTreatments).toHaveBeenCalledTimes(1);
        service.get('myKey2').getTreatmentsWithConfig(['test_split','test_split2']);
        expect(sharedClientSpy.getTreatmentsWithConfig).toHaveBeenCalled();
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
    service.SDKReady$.subscribe(() => {
      expect(service.getSplits()).toEqual(mockedSplitView);
      expect(service.getSplitNames()).toEqual(mockedSplitView.map(split => split.name))
      expect(service.getSplit('test_split2')).toEqual(mockedSplitView[1]);
      expect(service.getSplit('nonexistent_split')).toBeNull();
      done();
    });
  });
});
