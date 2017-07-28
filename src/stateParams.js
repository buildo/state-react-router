import find from 'lodash/find';
import identity from 'lodash/identity';
import t from 'tcomb';

export const encodeParams = params => {
  return Object.keys(params || {}).reduce((acc, paramName) => {
    return {
      ...acc,
      [paramName]: params[paramName] ? encodeURIComponent(params[paramName]) : params[paramName]
    };
  }, {});
};

export const parseParams = order => params => {

  const _parseParam = value => {
    const paramType = find(order, p => p.matchString(value));
    if (paramType) {
      return paramType.parse(value);
    } else {
      return value;
    }
  };

  return Object.keys(params || {}).reduce((ac, paramName) => {
    return {
      ...ac,
      [paramName]: _parseParam(params[paramName])
    };
  }, {});
};

export const stringifyParams = order => params => {

  const _stringifyParam = value => {
    const paramType = find(order, p => p.matchInstance(value));
    if (paramType) {
      return paramType.stringify(value);
    } else {
      return value;
    }
  };

  return Object.keys(params || {}).reduce((ac, paramName) => {
    return {
      ...ac,
      [paramName]: _stringifyParam(params[paramName])
    };
  }, {});
};
