/**
 * Angular utilities version number
 */
const ANGULAR_SDK_VERSION_NUMBER = '2.0.2-rc.0'
/**
 * SDK constant for control treatment
 */
export const CONTROL = 'control';
/**
 * string constant for observable to return when client exists for a key
 */
export const INIT_CLIENT_EXISTS = 'init::clientExists';
/**
 * string constant for observable to return when client is not initialized
 */
export const INIT_CLIENT_FIRST = 'init::clientFirst';

export const VERSION = 'angular-' + ANGULAR_SDK_VERSION_NUMBER;

/**
 * client with methods that return default values
 */
export const CONTROL_CLIENT = {
  getTreatment: () => { return CONTROL; },
  getTreatmentWithConfig: () => { return { treatment: CONTROL, config: null }; },
  getTreatments: (featureFlagNames: string[]) => {
    let result = {};
    featureFlagNames.forEach((featureFlagName) => {
      result = { ...result, [featureFlagName]: CONTROL };
    });
    return result;
  },
  getTreatmentsWithConfig: (featureFlagNames: string[]) => {
    let result = {};
    featureFlagNames.forEach((featureFlagName) => {
      result = { ...result, [featureFlagName]: { treatment: CONTROL, config: null } };
    });
    return result;
  },
  getTreatmentsByFlagSet: () => { return {}; },
  getTreatmentsWithConfigByFlagSet: () => { return {}; },
  getTreatmentsByFlagSets: () => { return {}; },
  getTreatmentsWithConfigByFlagSets: () => { return {}; },
  track: () => { return false; }
};

/**
 *  with methods that return default values
 */
export const DEFAULT_MANAGER = {
  splits: () => { return []; },
  split: () => { return null; },
  names: () => { return []; }
};
