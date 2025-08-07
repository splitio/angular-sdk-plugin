import { buildInstance, parseTreatmentParams, parseFlagSetParams, parseTrackParams, isString } from '../utils/utils';

describe('utils', () => {
  describe('buildInstance', () => {
    it('returns key if no bucketingKey', () => {
      expect(buildInstance('user1')).toBe('user1');
    });
    it('returns formatted string for SplitKey object', () => {
      // @ts-ignore
      expect(buildInstance({ matchingKey: 'm', bucketingKey: 'b' })).toBe('m-b-');
    });
    it('handles missing matchingKey', () => {
      // @ts-ignore
      expect(buildInstance({ bucketingKey: 'b' })).toBe('b-b-');
    });
    it('handles missing bucketingKey', () => {
      // @ts-ignore
      expect(buildInstance({ matchingKey: 'm' })).toBe('m-m-');
    });
  });

  describe('parseTreatmentParams', () => {
    it('parses with key and featureFlagNames', () => {
      const result = parseTreatmentParams('user1', 'flag1', { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: 'user1', featureFlagNames: 'flag1', attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with key and featureFlagNames as array', () => {
      const result = parseTreatmentParams('user1', ['flag1', 'flag2'], { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: 'user1', featureFlagNames: ['flag1', 'flag2'], attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with featureFlagNames only', () => {
      const result = parseTreatmentParams('flag1', { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: undefined, featureFlagNames: 'flag1', attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with featureFlagNames as array only', () => {
      const result = parseTreatmentParams(['flag1', 'flag2'], { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: undefined, featureFlagNames: ['flag1', 'flag2'], attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
  });

  describe('parseFlagSetParams', () => {
    it('parses with key and flagSetNames', () => {
      const result = parseFlagSetParams('user1', 'flagSet1', { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: 'user1', flagSetNames: 'flagSet1', attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with key and flagSetNames as array', () => {
      const result = parseFlagSetParams('user1', ['flagSet1', 'flagSet2'], { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: 'user1', flagSetNames: ['flagSet1', 'flagSet2'], attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with flagSetNames only', () => {
      const result = parseFlagSetParams('flagSet1', { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: undefined, flagSetNames: 'flagSet1', attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
    it('parses with flagSetNames as array only', () => {
      const result = parseFlagSetParams(['flagSet1', 'flagSet2'], { attr: 1 }, { properties: { enabled: true } });
      expect(result).toEqual({ key: undefined, flagSetNames: ['flagSet1', 'flagSet2'], attributes: { attr: 1 }, options: { properties: { enabled: true } } });
    });
  });

  describe('parseTrackParams', () => {
    it('parses with key, trafficType, eventType (string), value, properties', () => {
      const result = parseTrackParams('user1', 'traffic', 'event', 123, { foo: 'bar' });
      expect(result).toEqual({ key: 'user1', trafficType: 'traffic', eventType: 'event', value: 123, properties: { foo: 'bar' } });
    });
    it('parses with trafficType, eventType, value, properties (eventType as not string)', () => {
      const result = parseTrackParams('traffic', 'event', 123, { foo: 'bar' });
      expect(result).toEqual({ key: undefined, trafficType: 'traffic', eventType: 'event', value: 123, properties: { foo: 'bar' } });
    });
  });

  describe('isString', () => {
    it('returns true for string', () => {
      expect(isString('abc')).toBe(true);
    });
    it('returns true for String object', () => {
      expect(isString(new String('abc'))).toBe(true);
    });
    it('returns false for non-string', () => {
      expect(isString(123)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });
});
