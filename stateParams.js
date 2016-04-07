import find from 'lodash/find';
import identity from 'lodash/identity';
import t from 'tcomb';

const string = {
  matchString: () => true,
  matchInstance: t.String.is,
  parse: identity,
  stringify: identity
};

export const encodeParams = params => {
  return Object.keys(params || {}).reduce((acc, paramName) => {
    return {
      ...acc,
      [paramName]: params[paramName] ? encodeURIComponent(params[paramName]) : params[paramName]
    };
  }, {});
};

export const parseParams = _order => params => {
  const order = _order.concat(string);

  const parseParam = value => {
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
      [paramName]: parseParam(params[paramName])
    };
  }, {});
};

export const stringifyParams = _order => params => {
  const order = _order.concat(string);

  const stringifyParam = value => {
    const paramType = find(order.concat(string), p => p.matchInstance(value));
    if (paramType) {
      return paramType.stringify(value);
    } else {
      return value;
    }
  };

  return Object.keys(params || {}).reduce((ac, paramName) => {
    return {
      ...ac,
      [paramName]: stringifyParam(params[paramName])
    };
  }, {});
};
