import { firstValueFrom } from 'rxjs';

import { SplitService } from '../splitio.service';
import { mockedFeatureFlagView } from './mocks/SplitView.mock';
import {
  config,
  localhostConfig,
} from './testUtils/sdkConfigs';

describe('SplitService', () => {

  let service: SplitService;

  const logSpy = jest.spyOn(console, 'log');
  let logCalls = 0;

  beforeEach(() => {
    service = new SplitService();
    logSpy.mockReset();
    logCalls = 0;
  });

  test('SDK Events TIMED OUT', async () => {
    expect(service).toBeTruthy();
    service.init(config);
    await firstValueFrom(service.sdkReadyTimedOut$);
    expect(service.isSDKReady).toEqual(false);
  });

  test('SDK Events READY / UPDATE', async () => {
    let calledTimes = 0;
    expect(service.isSDKReady).toEqual(false);

    service.init(localhostConfig);
    const sdk = service.getSDKFactory();
    if (!sdk) throw new Error('SDK should be initialized');

    await service.ready();
    expect(service.isSDKReady).toEqual(true);

    // Wait for first ready emission
    await firstValueFrom(service.sdkReady$);
    expect(service.isSDKReady).toEqual(true);

    // Verify we can subscribe multiple times - wait for ready again
    await firstValueFrom(service.sdkReady$);

    // Now test UPDATE events - we need to subscribe before triggering the event
    // Modify features to trigger first update event
    sdk.settings.features = { test_split: '0' };
    await firstValueFrom(service.sdkUpdate$);
    expect(service.isSDKReady).toEqual(true);
    calledTimes++;

    // Second update
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.sdkUpdate$);
    expect(service.isSDKReady).toEqual(true);
    calledTimes++;

    // Third update
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.sdkUpdate$);
    expect(service.isSDKReady).toEqual(true);
    calledTimes++;

    // Final update and verification
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.sdkUpdate$);
    expect(service.getTreatment('test_split')).toEqual('3');
  });

  test('Shared clients Events READY / UPDATE', async () => {
    let calledTimes = 0;
    const key5 = 'myKey5';
    const key6 = 'myKey6';

    service.init(localhostConfig);
    const sdk = service.getSDKFactory();
    if (!sdk) throw new Error('SDK should be initialized');

    // Test error when client not initialized - wrap in try-catch since error is thrown synchronously
    try {
      await firstValueFrom(service.getClientSDKReady(key5));
      throw new Error('Should have thrown');
    } catch (error) {
      expect(logSpy).toHaveBeenCalledWith('[ERROR] client for key ' + key5 + ' should be initialized first.');
    }

    // Initialize client key5
    service.initClient(key5);

    // Wait for key5 client to be ready
    await firstValueFrom(service.getClientSDKReady(key5));
    expect(service.getSDKClient(key5)?.getTreatment('test_split')).toEqual(service.getTreatment(key5,'test_split'));

    // Initialize client key6 and wait for ready
    await firstValueFrom(service.initClient(key6));
    expect(service.getSDKClient(key6)?.getTreatment('test_split')).toEqual(service.getTreatment(key6,'test_split'));

    // Verify we can subscribe to ready multiple times
    await firstValueFrom(service.getClientSDKReady(key5));
    await firstValueFrom(service.getClientSDKReady(key5));

    // Modify features to trigger update events - similar pattern to first test
    sdk.settings.features = { test_split: '0' };

    // First update
    await firstValueFrom(service.getClientSDKUpdate(key5));
    calledTimes++;

    // Second update - verify we can subscribe at this point
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.getClientSDKUpdate(key5));
    calledTimes++;
    expect(service.getSDKClient(key5)?.getTreatment('test_split')).toEqual(service.getTreatment(key5,'test_split'));
    expect(service.getTreatment(key5,'test_split')).toEqual('1');

    // Third update
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.getClientSDKUpdate(key5));
    calledTimes++;

    // Final verification
    sdk.settings.features = { test_split: calledTimes.toString() };
    await firstValueFrom(service.getClientSDKUpdate(key5));
    expect(service.getSDKClient(key5)?.getTreatment('test_split')).toEqual(service.getTreatment(key5,'test_split'));
    expect(service.getTreatment(key5,'test_split')).toEqual('3');
  });


  test('Evaluations', async () => {
    expect(service.isSDKReady).toEqual(false);
    await firstValueFrom(service.init(localhostConfig));

    service.init(config).subscribe({
      next: () => { throw new Error('it should not reach here'); },
      error: () => {
        expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] There is another instance of the SDK.');
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
    expect(clientSpy.getTreatment.mock.calls[0]).toEqual(['test_split', undefined]);
    service.getTreatmentWithConfig('test_split', {attr: true}, {properties: { enabled: true }});
    expect(clientSpy.getTreatmentWithConfig.mock.calls[0]).toEqual(['test_split', {attr: true}, {properties: { enabled: true }}]);
    service.getTreatments(['test_split','test_split2'], {attr: true}, {properties: { enabled: true }});
    expect(clientSpy.getTreatments.mock.calls[0]).toEqual([['test_split','test_split2'], {attr: true}, {properties: { enabled: true }}]);
    service.getTreatmentsWithConfig(['test_split','test_split2']);
    expect(clientSpy.getTreatmentsWithConfig.mock.calls[0]).toEqual([['test_split','test_split2']]);

    const sharedClientKey = 'myKey2';
    // initialize shared client and wait for ready
    await firstValueFrom(service.initClient(sharedClientKey));
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
        expect(logSpy.mock.calls[logCalls++][0]).toEqual('[WARN] client for key ' + sharedClientKey + ' is already initialized.');
      }
    });

    // @ts-ignore
    expect(service.getTreatment({matchingKey: sharedClientKey, bucketingKey:'test'}, 'test_split')).toEqual('control');
    // @ts-ignore
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key myKey2-test- should be initialized first.');

    // Plugin should use control client for nonExistents keys
    const nonexistentKey = {matchingKey: 'myKey3', bucketingKey: '1' };
    // @ts-ignore
    expect(service.getTreatment(nonexistentKey, 'test_split')).toEqual('control');
    // @ts-ignore
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key myKey3-1- should be initialized first.');
    expect(sharedClientSpy.getTreatment).toHaveBeenCalledTimes(0);

    // @ts-ignore
    expect(service.getTreatmentWithConfig(nonexistentKey, 'test_split')).toEqual({ treatment: 'control', config: null });
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key myKey3-1- should be initialized first.');
    expect(sharedClientSpy.getTreatment).toHaveBeenCalledTimes(0);

    // @ts-ignore
    expect(service.getTreatments(nonexistentKey, ['test_split', 'test_split2']))
      .toEqual({
        test_split: 'control',
        test_split2: 'control'
      });
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key myKey3-1- should be initialized first.');
    expect(sharedClientSpy.getTreatmentWithConfig).toHaveBeenCalledTimes(0);

    // @ts-ignore
    expect(service.getTreatmentsWithConfig(nonexistentKey, ['test_split', 'test_split2']))
      .toEqual({
        test_split: { treatment: 'control', config: null },
        test_split2: { treatment: 'control', config: null }
      });
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key myKey3-1- should be initialized first.');
    expect(sharedClientSpy.getTreatmentsWithConfig).toHaveBeenCalledTimes(0);

    // verify that main client is not evaluating when evaluates for shared client
    expect(service.getTreatment(sharedClientKey, 'test_split', {attr: true}, { properties: { enabled: true }})).toEqual('on');
    expect(sharedClientSpy.getTreatment.mock.calls[0]).toEqual(['test_split', {attr: true}, { properties: { enabled: true }}]);
    expect(clientSpy.getTreatment).toHaveBeenCalledTimes(1);

    expect(service.getTreatmentWithConfig(sharedClientKey, 'test_split', {attr: true}, { properties: { enabled: true }})).toEqual({treatment: 'on', config: null});
    expect(sharedClientSpy.getTreatmentWithConfig.mock.calls[0]).toEqual(['test_split', {attr: true}, { properties: { enabled: true }}]);
    expect(clientSpy.getTreatmentWithConfig).toHaveBeenCalledTimes(1);

    expect(service.getTreatments(sharedClientKey, ['test_split','test_split2'], {attr: true}, { properties: { enabled: true }}))
      .toEqual({
        'test_split': 'on',
        'test_split2': 'off'
      });
    expect(sharedClientSpy.getTreatments.mock.calls[0]).toEqual([['test_split','test_split2'], {attr: true}, { properties: { enabled: true }}]);
    expect(clientSpy.getTreatments).toHaveBeenCalledTimes(1);

    expect(service.getTreatmentsWithConfig(sharedClientKey, ['test_split','test_split2'], {attr: true}, { properties: { enabled: true }}))
      .toEqual({
        test_split: { treatment: 'on', config: null },
        test_split2: { treatment: 'off', config: '{"bannerText":"Click here."}' }
      });
    expect(sharedClientSpy.getTreatmentsWithConfig.mock.calls[0]).toEqual([['test_split','test_split2'], {attr: true}, { properties: { enabled: true }}]);
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
  });

  test('Flag sets', async () => {
    expect(service.isSDKReady).toEqual(false);

    expect(service.getTreatmentsByFlagSet('set_a')).toEqual({});
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client should be initialized first.');

    expect(service.getTreatmentsWithConfigByFlagSet('set_a')).toEqual({});
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client should be initialized first.');

    expect(service.getTreatmentsByFlagSets(['set_a','set_b'])).toEqual({});
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client should be initialized first.');

    expect(service.getTreatmentsWithConfigByFlagSets(['set_a','set_b'])).toEqual({});
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client should be initialized first.');

    await firstValueFrom(service.init(localhostConfig));

    const mainClient = service.getSDKClient();
    expect(service.isSDKReady).toEqual(true);

    const clientSpy = {
      getTreatmentsByFlagSet: jest.spyOn(mainClient, 'getTreatmentsByFlagSet'),
      getTreatmentsWithConfigByFlagSet: jest.spyOn(mainClient, 'getTreatmentsWithConfigByFlagSet'),
      getTreatmentsByFlagSets: jest.spyOn(mainClient, 'getTreatmentsByFlagSets'),
      getTreatmentsWithConfigByFlagSets: jest.spyOn(mainClient, 'getTreatmentsWithConfigByFlagSets'),
    };

    service.getTreatmentsByFlagSet('set_a');
    expect(clientSpy.getTreatmentsByFlagSet.mock.calls[0]).toEqual(['set_a', undefined]);
    service.getTreatmentsWithConfigByFlagSet('set_a', {attr: true}, { properties: {enabled: true}});
    expect(clientSpy.getTreatmentsWithConfigByFlagSet.mock.calls[0]).toEqual(['set_a', {attr: true}, { properties: {enabled: true}}]);
    service.getTreatmentsByFlagSets(['set_a','set_b'], {attr: true}, { properties: {enabled: true}});
    expect(clientSpy.getTreatmentsByFlagSets.mock.calls[0]).toEqual([['set_a','set_b'], {attr: true}, { properties: {enabled: true}}]);
    service.getTreatmentsWithConfigByFlagSets(['set_a','set_b']);
    expect(clientSpy.getTreatmentsWithConfigByFlagSets.mock.calls[0]).toEqual([['set_a','set_b'], undefined]);
  });

  test('SDK Manager', async () => {
    expect(service.getSplitNames()).toEqual([]);
    service.init(localhostConfig);
    await firstValueFrom(service.sdkReady$);
    // @ts-ignore
    expect(service.getSplits()).toEqual(mockedFeatureFlagView);
    expect(service.getSplitNames()).toEqual(mockedFeatureFlagView.map(split => split.name));
    // @ts-ignore
    expect(service.getSplit('test_split2')).toEqual(mockedFeatureFlagView[1]);
    expect(service.getSplit('nonexistent_split')).toBeNull();
  });

  test('Track', async () => {
    const trackKey = 'trackKey';

    expect(service.track('user', 'submit')).toEqual(false);
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client should be initialized first.');

    await firstValueFrom(service.init(localhostConfig));

    expect(service.track(trackKey, 'user', 'submit')).toEqual(false);
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key ' + trackKey + ' should be initialized first.');

    await firstValueFrom(service.initClient(trackKey));

    const mainClient = service.getSDKClient();
    const sharedClient = service.getSDKClient(trackKey);

    if (!mainClient) throw new Error('client should exists');
    const mainClientSpy = {
      track: jest.spyOn(mainClient, 'track')
    };

    if (!sharedClient) throw new Error('client should exists');
    const sharedClientSpy = {
      track: jest.spyOn(sharedClient, 'track')
    };

    expect(service.track('user', 'click', 5, {country: 'ARG'})).toEqual(true);
    expect(mainClientSpy.track.mock.calls[0]).toEqual(['user', 'click', 5, {country: 'ARG'}]);
    expect(sharedClientSpy.track).toHaveBeenCalledTimes(0);

    expect(service.track('user', 'click')).toEqual(true);
    expect(mainClientSpy.track.mock.calls[1]).toEqual(['user', 'click', undefined, undefined]);
    expect(sharedClientSpy.track).toHaveBeenCalledTimes(0);

    expect(service.track(trackKey, 'user', 'click', 6)).toEqual(true);
    expect(sharedClientSpy.track.mock.calls[0]).toEqual(['user', 'click', 6, undefined]);
    expect(mainClientSpy.track).toHaveBeenCalledTimes(2);

    expect(service.track(trackKey, 'user', 'click', undefined, {country: 'ARG'})).toEqual(true);
    expect(sharedClientSpy.track.mock.calls[1]).toEqual(['user', 'click', undefined, {country: 'ARG'}]);
    expect(mainClientSpy.track).toHaveBeenCalledTimes(2);

    expect(service.track(trackKey, 'user', 'click', undefined, undefined)).toEqual(true);
    expect(sharedClientSpy.track.mock.calls[2]).toEqual(['user', 'click', undefined, undefined]);
    expect(mainClientSpy.track).toHaveBeenCalledTimes(2);

    // @ts-ignore
    expect(service.track(trackKey, 'user', 'click', 'something', undefined)).toEqual(false);
    expect(sharedClientSpy.track).toHaveBeenCalledTimes(4);
    expect(mainClientSpy.track).toHaveBeenCalledTimes(2);

    // @ts-ignore
    expect(service.track('user', 'click', 'something', undefined)).toEqual(false);
    expect(sharedClientSpy.track).toHaveBeenCalledTimes(4);
    expect(mainClientSpy.track).toHaveBeenCalledTimes(2);
  });

  test('Destroy', async () => {
    const clientKey = 'clientKey';

    await firstValueFrom(service.init(localhostConfig));
    await firstValueFrom(service.initClient(clientKey));
    expect(service.getTreatment(localhostConfig.core.key, 'test_split', {attr: true})).toEqual('on');
    expect(service.getTreatment(clientKey, 'test_split', {attr: true})).toEqual('on');

    await firstValueFrom(service.destroy());
    expect(service.getTreatment(localhostConfig.core.key, 'test_split', {attr: true})).toEqual('control');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key ' + localhostConfig.core.key + ' should be initialized first.');

    expect(service.getTreatment(clientKey, 'test_split', {attr: true})).toEqual('control');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] plugin should be initialized');
    expect(logSpy.mock.calls[logCalls++][0]).toEqual('[ERROR] client for key ' + clientKey + ' should be initialized first.');
  });
});
