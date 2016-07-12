import t from 'tcomb';
import identity from 'lodash/identity';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import { encodeParams, stringifyParams as _stringifyParams, parseParams as _parseParams } from './stateParams';
import patchReactRouter from './patch-react-router';
import shallowEqual from 'state/shallowEqual'; // TODO(split)
import debug from 'debug';

const log = debug('state-react-router:routerDiff');

function _shouldRouterPatchBePushed({
  state: oldState, params: oldParams//, query: oldQuery
}, {
  state: newState, params: newParams//, query: newQuery
}) {
  if (newState !== null && newState !== oldState) {
    return true;
  }

  if (newParams !== null && !shallowEqual(newParams, oldParams)) {
    return true;
  }

  // ignoring all query params for simplicity for now (always replaced)
  return false;
}

export default function routerDiff({
  // the state key that should be used to
  // identify the currently active view
  //
  // String
  //
  routerStateKey = 'view',

  // the state keys that are directly mapped to
  // react-router path params
  //
  // Array<String>
  //
  routerStatePathParamKeys = [],

  // the state keys that should be ignored
  // when syncing to react-router (never part of location)
  //
  // Array<String>
  //
  ignoreParams = [],

  // custom parsers/stringifiers for stateParams
  // by default, all params are not touched (i.e. handled as strings)
  // priority: first will match, so more specific ones should go first
  // each element should have the following form:
  //
  // ParserStringifier {
  //  matchString: (stringValue: String) => matched: Boolean,
  //  matchInstance: (instanceValue: Any) => matched: Boolean,
  //  parse: (stringValue: String) => instanceValue: Any,
  //  stringify: (instanceValue: Any) => stringValue: String
  // }
  //
  // Array<ParserStringifier>
  //
  paramsParsers = [],

  // optional
  //
  // (oldRRState, newRRState) -> Boolean
  shouldRouterPatchBePushed = _shouldRouterPatchBePushed
}) {

  const parseParams = _parseParams(paramsParsers);
  const stringifyParams = _stringifyParams(paramsParsers);

  function maybePatchRouter(router) {
    if (!router.makeHrefPatch) {
      patchReactRouter(router);
    }
  }

  function routerStateDiff(oldState, newState) {
    const newRouterState = oldState[routerStateKey] !== newState[routerStateKey] ? newState[routerStateKey] : null;

    const routerStatePathParams = pick(newState, routerStatePathParamKeys);
    const oldRouterStatePathParams = pick(oldState, routerStatePathParamKeys);
    const newRouterStatePathParams = !shallowEqual(
      routerStatePathParams, oldRouterStatePathParams
    ) ? routerStatePathParams : null;

    const routerStateQueryParams = omit(newState, ignoreParams);
    const oldRouterStateQueryParams = omit(oldState, ignoreParams);
    // this additional nil-patch ensures RR actually picks up and deletes unset query params
    // we don't care too much for path params as they are filtered anyway by route
    for (const k in oldRouterStateQueryParams) { // eslint-disable-line no-loops/no-loops
      if (t.Nil.is(routerStateQueryParams[k])) {
        routerStateQueryParams[k] = undefined;
      }
    }
    const newRouterStateQueryParams = !shallowEqual(
      routerStateQueryParams, oldRouterStateQueryParams
    ) ? routerStateQueryParams : null;

    if (newRouterState || newRouterStatePathParams || newRouterStateQueryParams) {
      // react-router doesn't encode path params,
      // but only query params
      return [newRouterState, encodeParams(stringifyParams(newRouterStatePathParams)), stringifyParams(newRouterStateQueryParams)];
    } else {
      return false;
    }
  }

  function statePatchFromBrowser(routerState) {
    // react-router doesn't decode path params,
    // but only query params
    return parseParams({
      [routerStateKey]: routerState.routes.map(r => r.name).filter(identity).reverse()[0],
      ...routerStatePathParamKeys.reduce((ac, k) => ({
        ...ac,
        [k]: routerState.params[k] ? decodeURIComponent(routerState.params[k]) : null
      }), {}),
      ...routerState.query
    });
  }

  function mergeStateAndBrowserState(state, parsedRouterState) {
    const merged = { ...state, ...parsedRouterState };
    for (const k in state) { // eslint-disable-line no-loops/no-loops
      if (t.Nil.is(parsedRouterState[k]) && ignoreParams.indexOf(k) === -1) {
        delete merged[k];
      }
    }
    return merged;
  }

  // returns the `syncToBrowser` (documented elsewhere) function,
  // able to apply (if needed) a given transition to router/location.
  // router should be a react-router@0.13 instance
  //
  // (router: Router) => syncToBrowser: Function
  //
  function makeSyncToBrowser(router) {
    maybePatchRouter(router);
    return (state, newState) => {
      const routerDiff = routerStateDiff(state, newState);
      log('transition routerDiff', routerDiff);

      if (routerDiff) {
        const currentRouterState = {
          state: router.getLastRouteName(),
          params: router.getCurrentParams(),
          query: router.getCurrentQuery()
        };
        const nextRouterState = {
          state: newState[routerStateKey] || router.getLastRouteName(),
          params: encodeParams(stringifyParams(pick(newState, routerStatePathParamKeys))),
          // react-router doesn't encode path params,
          // but only query params
          query: stringifyParams(omit(newState, [routerStateKey].concat(routerStatePathParamKeys).concat(ignoreParams)))
        };
        if (shouldRouterPatchBePushed(currentRouterState, nextRouterState)) {
          log('pushState (transitionTo)', nextRouterState.state, nextRouterState.params, nextRouterState.query);
          router.transitionTo(nextRouterState.state, nextRouterState.params, nextRouterState.query);
        } else {
          log('replaceState (replaceWith)');
          router.replaceWith(nextRouterState.state, nextRouterState.params, nextRouterState.query);
        }
      }

      return !!routerDiff;
    };
  }

  // returns the `onBrowserChange` (documented elsewhere) function,
  // able to register a callback to be run at every browser change
  // renderFn can customize/wrap the Handler (Component) matched by the router
  // router should be a react-router@0.13 instance
  //
  // (
  //   router: Router,
  //   renderFn: (Handler: ReactComponent) => () => ReactElement
  // ) => onBrowserChange: Function
  //
  function makeOnBrowserChange(router, renderFn) {
    maybePatchRouter(router);
    return cb => {
      router.run((Handler, routerState) => {
        const fromRouter = statePatchFromBrowser(routerState);
        cb(renderFn(Handler), fromRouter);
      });
    };
  }

  return {
    makeSyncToBrowser,
    makeOnBrowserChange,
    mergeStateAndBrowserState
  };
}
