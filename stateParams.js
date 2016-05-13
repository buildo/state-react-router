import find from 'lodash/find';
import identity from 'lodash/identity';
import t from 'tcomb';

const getDefaultParamTypes = order => {
  const json = {
    matchString: t.Object.is,
    matchInstance: t.Object.is,
    parse: x => parseParams(order)(x),
    stringify: x => stringifyParams(order)(x) // if you use `JSON.stringify` `encodeURIComponent` fails to recognize it as an object and treats it as a string
  };

  const string = {
    matchString: () => true,
    matchInstance: t.String.is,
    parse: identity,
    stringify: identity
  };

  return [json, string];
}

export const encodeParams = params => {
  return Object.keys(params || {}).reduce((acc, paramName) => {
    return {
      ...acc,
      [paramName]: params[paramName] ? encodeURIComponent(params[paramName]) : params[paramName]
    };
  }, {});
};

export const parseParams = _order => params => {
  const order = _order.concat(getDefaultParamTypes(_order));

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

export const stringifyParams = _order => params => {
  const order = _order.concat(getDefaultParamTypes(_order));

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
