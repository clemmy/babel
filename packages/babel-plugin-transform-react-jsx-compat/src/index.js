export default function ({ types: t }) {
  return {
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("jsx");
    },

    visitor: require("babel-helper-builder-react-jsx")({
      pre(state) {
        state.jsxIdentifier = state.tagExpr;
      },

      post(state) {
        if (t.react.isCompatTag(state.tagName)) {
          state.call = t.callExpression(
            t.memberExpression(
              t.memberExpression(t.identifier("React"), t.identifier("DOM")),
              state.tagExpr,
              t.isLiteral(state.tagExpr)
            ),
            state.args
          );
        }
      },
      compat: true
    })
  };
}
