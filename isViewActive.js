import memoize from 'lodash/memoize';
import flatten from 'lodash/flatten';
import identity from 'lodash/identity';

// factory returning the `isViewActive` function
// routes should be the react-router@0.13 jsx routes definition
//
// (routes: Object) => Function
//
export default function isViewActive(routes) {

  function extractRoutes({ props: { children, name } }) {
    return {
      name,
      children: [].concat(children).filter(identity).map(extractRoutes)
    };
  }

  const extractedRoutes = extractRoutes(routes);

  const activeViews = memoize((activeView, route) => {
    if (route.name === activeView) {
      return [activeView];
    }

    const activeChildren = flatten(route.children.map(r => activeViews(activeView, r)));
    return activeChildren.length > 0 ? [...(route.name ? [route.name] : []), ...activeChildren] : [];
  }, (v, r) => `${v}${r.name}`);

  // returns true if `testView` is `activeView` or
  // its descendant in the routes definition hierarchy
  //
  // (activeView: String, testView: String) => Boolean
  //
  return (activeView, testView) => {
    return activeViews(activeView, extractedRoutes).indexOf(testView) !== -1;
  };
}