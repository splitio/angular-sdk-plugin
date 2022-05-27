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

export const VERSION = 'angular-' + 'ANGULAR_SDK_VERSION_NUMBER';

/**
 * client with methods that return default values
 */
export const CONTROL_CLIENT = {
  getTreatment: () => { return CONTROL; },
  getTreatmentWithConfig: () => { return { treatment: CONTROL, config: null }; },
  getTreatments: (splitNames: string[]) => {
    let result = {};
    splitNames.forEach((splitName) => {
      result = { ...result, [splitName]: CONTROL };
    });
    return result;
  },
  getTreatmentsWithConfig: (splitNames: string[]) => {
    let result = {};
    splitNames.forEach((splitName) => {
      result = { ...result, [splitName]: { treatment: CONTROL, config: null } };
    });
    return result;
  },
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
