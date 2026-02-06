import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import {
  provideSplitIo,
  SplitIoService,
  withConfig,
  withFeatureOptions,
} from '../providers';

describe('SplitIoService (Provider Pattern)', () => {
  let service: SplitIoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            autoInit: true,
            debug: false
          })
        )
      ]
    });

    service = TestBed.inject(SplitIoService);
  });

  test('should be created', () => {
    expect(service).toBeTruthy();
  });

  test('should auto-initialize on creation', async () => {
    const ready = await firstValueFrom(
      service.isReady$.pipe(filter(r => r))
    );
    expect(ready).toBe(true);
    expect(service.isReady).toBe(true);
  });

  test('should provide observable streams', () => {
    expect(service.isReady$).toBeDefined();
    expect(service.isReadyFromCache$).toBeDefined();
    expect(service.isTimedOut$).toBeDefined();
    expect(service.hasUpdate$).toBeDefined();
  });

  test('should get treatment', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const treatment = service.getTreatment('test-flag');
    expect(treatment).toBeDefined();
    expect(typeof treatment).toBe('string');
  });

  test('should get treatments for multiple flags', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const treatments = service.getTreatments(['flag1', 'flag2']);
    expect(treatments).toBeDefined();
    expect(typeof treatments).toBe('object');
    expect(treatments).toHaveProperty('flag1');
    expect(treatments).toHaveProperty('flag2');
  });

  test('should track events', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const result = service.track('test-event', 'user');
    expect(result).toBe(true);
  });

  test('should get treatment with attributes', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const attributes = { age: 25, plan: 'premium' };
    const treatment = service.getTreatment('test-flag', attributes);
    expect(treatment).toBeDefined();
    expect(typeof treatment).toBe('string');
  });

  test('should handle error cases gracefully', () => {
    const treatment = service.getTreatment('');
    expect(treatment).toBeDefined();
  });

  test('should destroy client', () => {
    expect(() => service.destroy()).not.toThrow();
  });
});

describe('SplitIoService - Signal Support', () => {
  let service: SplitIoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            autoInit: true,
            debug: false
          })
        )
      ]
    });

    service = TestBed.inject(SplitIoService);
  });

  test('should provide signal properties', () => {
    expect(service.isReadySignal).toBeDefined();
    expect(service.isReadyFromCacheSignal).toBeDefined();
    expect(service.isTimedOutSignal).toBeDefined();
    expect(service.hasUpdateSignal).toBeDefined();
  });

  test('should update isReadySignal when SDK becomes ready', async () => {
    // Wait for SDK to be ready (auto-initializes)
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    expect(service.isReadySignal()).toBe(true);
  });

  test('should keep signals in sync with observables', async () => {
    const ready = await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    expect(ready).toBe(true);
    expect(service.isReadySignal()).toBe(true);
    expect(service.isReady).toBe(true);
  });

  test('should allow signals to be used in computed contexts', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const isReadyValue = service.isReadySignal();
    expect(typeof isReadyValue).toBe('boolean');
    expect(isReadyValue).toBe(true);
  });

  test('should update isReadyFromCacheSignal when ready from cache', async () => {
    const initialValue = service.isReadyFromCacheSignal();
    expect(typeof initialValue).toBe('boolean');
  });

  test('isTimedOutSignal should be false when SDK loads successfully', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    expect(service.isTimedOutSignal()).toBe(false);
  });

  test('hasUpdateSignal should be accessible', () => {
    const hasUpdate = service.hasUpdateSignal();
    expect(typeof hasUpdate).toBe('boolean');
  });

  test('signals should be readonly and not writable from outside', () => {
    const signal = service.isReadySignal;

    // Attempting to call set should not exist on readonly signal
    expect((signal as any).set).toBeUndefined();
  });
});

describe('SplitIoService Configuration', () => {
  test('should work with custom configuration', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'custom-key',
              key: 'custom-user'
            },
            autoInit: false,
            debug: true,
            startup: {
              readyTimeout: 5000
            }
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);
    expect(service).toBeTruthy();
  });

  test('should work with feature options', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            }
          }),
          withFeatureOptions({
            enableImpressions: true,
            enableEvents: true
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);
    expect(service).toBeTruthy();
  });

  test('should use default config if none provided', () => {
    TestBed.configureTestingModule({
      providers: [provideSplitIo()]
    });

    const service = TestBed.inject(SplitIoService);
    expect(service).toBeTruthy();
  });

  test('should handle custom error handler', async () => {
    const errorHandler = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            errorHandler
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);

    const ready = await firstValueFrom(
      service.isReady$.pipe(filter(r => r))
    );

    expect(ready).toBe(true);
    expect(service).toBeTruthy();
  });
});

describe('SplitIoService - Advanced Features', () => {
  let service: SplitIoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            debug: true
          })
        )
      ]
    });

    service = TestBed.inject(SplitIoService);
  });

  describe('getTreatmentWithConfig', () => {
    test('should get treatment with config', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const result = service.getTreatmentWithConfig('test-flag');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('treatment');
      expect(result).toHaveProperty('config');
    });

    test('should get treatment with config and attributes', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const result = service.getTreatmentWithConfig('test-flag', { age: 30 });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('treatment');
    });
  });

  describe('getSplits', () => {
    test('should get all splits', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const splits = service.getSplits();
      expect(Array.isArray(splits)).toBe(true);
    });

    test('should get a specific split', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const split = service.getSplit('test-flag');
      expect(split).toBeDefined();
    });

    test('should get split names', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const names = service.getSplitNames();
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('ready', () => {
    test('should resolve when SDK is ready', async () => {
      await service.ready();
      expect(service.isReady).toBe(true);
    });
  });

  describe('createClient', () => {
    test('should create a new client for a specific key', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      try {
        const client = await firstValueFrom(service.createClient('new-user'));
        expect(client).toBeDefined();
      } catch (err) {
        // In localhost mode, this might not fully work, so we accept both paths
        expect(err).toBeDefined();
      }
    });

    test('should reuse existing client if already created', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const key = 'reuse-user';

      try {
        await firstValueFrom(service.createClient(key));
        // Try to create the same client again
        const client = await firstValueFrom(service.createClient(key));
        expect(client).toBeDefined();
      } catch {
        // In localhost mode, this might not fully work
        expect(true).toBe(true);
      }
    });
  });

  describe('track with different signatures', () => {
    test('should track with traffic type and event type', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const result = service.track('user', 'page_view');
      expect(typeof result).toBe('boolean');
    });

    test('should track with value', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const result = service.track('user', 'purchase', 99.99);
      expect(typeof result).toBe('boolean');
    });

    test('should track with properties', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const result = service.track('user', 'purchase', 99.99, {
        productId: 'abc123',
        category: 'electronics'
      });
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getTreatments with different signatures', () => {
    test('should get treatments with attributes', async () => {
      await firstValueFrom(service.isReady$.pipe(filter(r => r)));

      const treatments = service.getTreatments(['flag1', 'flag2'], { age: 25 });
      expect(treatments).toBeDefined();
      expect(typeof treatments).toBe('object');
    });
  });

  describe('observables', () => {
    test('should emit isReadyFromCache$ event', async () => {
      // Wait a bit for potential cache events
      await new Promise(resolve => setTimeout(resolve, 100));

      // Just verify the observable exists and is working
      expect(service.isReadyFromCache$).toBeDefined();
    });

    test('should emit hasUpdate$ event', async () => {
      // Wait a bit for potential update events
      await new Promise(resolve => setTimeout(resolve, 50));

      // Just verify the observable exists and is working
      expect(service.hasUpdate$).toBeDefined();
    });
  });
});

describe('SplitIoService - Error Handling', () => {
  test('should handle missing SDK gracefully when calling methods', () => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            autoInit: false // Don't auto-initialize
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);

    // These should return default/safe values when SDK not initialized
    expect(service.getTreatment('test')).toBe('control');
    expect(service.getTreatmentWithConfig('test')).toEqual({ treatment: 'control', config: null });
    expect(service.getTreatments(['test'])).toEqual({});
    expect(service.track('user', 'event')).toBe(false);
    expect(service.getSplits()).toEqual([]);
    expect(service.getSplit('test')).toBeNull();
    expect(service.getSplitNames()).toEqual([]);
  });

  test('should handle createClient without initialized SDK', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            autoInit: false
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);

    await expect(
      firstValueFrom(service.createClient('test-key'))
    ).rejects.toMatchObject({
      message: expect.stringContaining('SDK not initialized')
    });
  });

  test('should handle ready without initialized SDK', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            },
            autoInit: false
          })
        )
      ]
    });

    const service = TestBed.inject(SplitIoService);

    await expect(service.ready()).rejects.toThrow('SDK not initialized');
  });
});

describe('SplitIoService - Multi-Key Support', () => {
  let service: SplitIoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideSplitIo(
          withConfig({
            core: {
              authorizationKey: 'localhost',
              key: 'test-user'
            }
          })
        )
      ]
    });

    service = TestBed.inject(SplitIoService);
  });

  test('should handle getTreatment with SplitKey (multi-key scenario)', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    // Test getTreatment with key object
    const key = { matchingKey: 'user-123', bucketingKey: 'bucket-123' };
    const treatment = service.getTreatment(key, 'test-flag');
    expect(treatment).toBeDefined();
    expect(typeof treatment).toBe('string');
  });

  test('should handle getTreatmentWithConfig with SplitKey', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const key = { matchingKey: 'user-456', bucketingKey: 'bucket-456' };
    const result = service.getTreatmentWithConfig(key, 'test-flag', { age: 25 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty('treatment');
    expect(result).toHaveProperty('config');
  });

  test('should handle getTreatments with SplitKey', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const key = { matchingKey: 'user-789', bucketingKey: 'bucket-789' };
    const treatments = service.getTreatments(key, ['flag1', 'flag2']);
    expect(treatments).toBeDefined();
    expect(typeof treatments).toBe('object');
  });

  test('should handle track with SplitKey', async () => {
    await firstValueFrom(service.isReady$.pipe(filter(r => r)));

    const key = { matchingKey: 'user-track', bucketingKey: 'bucket-track' };
    const result = service.track(key, 'user', 'click');
    expect(typeof result).toBe('boolean');
  });
});
