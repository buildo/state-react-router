import omit from 'lodash/omit';
import find from 'lodash/find';

const lastRouteName = function(routes = []) {
  return find(routes.map(r => r.name).reverse(), rn => !!rn);
};

export default function patchReactRouter(router) {
  const makeArgs = function(state, params, query) {
    const ps = {
      ...router.getCurrentParams(),
      ...(params || {})
    };
    const q = omit({
      ...router.getCurrentQuery(),
      ...(query || {})
    }, x => !x );

    const s = state || router.getLastRouteName();
    return { ps, q, s };
  };

  // ~ same as transitionTo
  // but instead of substituting completely state, params and query,
  // it patches them using current versions as base
  // (similar in spirit to what React.setState does)
  router.transitionToPatch = function(state, params, query) {
    const { ps, q, s } = makeArgs(state, params, query);
    return router.transitionTo(s, ps, q);
  };

  router.makeHrefPatch = function(state, params, query) {
    const { ps, q, s } = makeArgs(state, params, query);
    return router.makeHref(s, ps, q);
  };

  router.isActivePatch = function(to, params, query) {
    const toPatch = to || this.getLastRouteName();
    return this.isActive(toPatch, params, query);
  };

  router.getLastRouteName = function() {
    return lastRouteName(this.getCurrentRoutes());
  };

  router.replaceWithPatch = function(state, params, query) {
    const { ps, q, s } = makeArgs(state, params, query);
    return router.replaceWith(s, ps, q);
  };


  return router;
}
