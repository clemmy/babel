import jsx from "babel-plugin-syntax-jsx";
import helper from "babel-helper-builder-react-jsx";

function parseIdentifier(id: string, t) {
  return id.split(".")
    .map((name) => t.identifier(name))
    .reduce((object, property) => t.memberExpression(object, property));
}

function parseJsxIdentifier(id: string, t) {
  return id.split(".")
    .map((name) => t.JSXIdentifier(name))
    .reduce((object, property) => t.JSXMemberExpression(object, property));
}

export default function ({ types: t }) {
  const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;
  const JSX_FRAG_ANNOTATION_REGEX = /\*?\s*@jsxFrag\s+([^\s]+)/;

  const visitor = helper({
    pre(state) {
      const tagName = state.tagName;
      const args    = state.args;
      if (t.react.isCompatTag(tagName)) {
        args.push(t.stringLiteral(tagName));
      } else {
        args.push(state.tagExpr);
      }
    },

    post(state, pass) {
      state.jsxIdentifier = pass.get("jsxIdentifier");
    }
  });

  visitor.Program = function (path, state) {
    const { file } = state;
    let pragmaJsx = state.opts.pragma || state.opts.pragmaJsx || "React.createElement";
    let pragmaJsxFrag = state.opts.pragmaJsxFrag || "React.Fragment";

    for (const comment of (file.ast.comments: Array<Object>)) {
      const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);
      if (jsxMatches) {
        pragmaJsx = jsxMatches[1];
        if (pragmaJsx === "React.DOM") {
          throw file.buildCodeFrameError(comment,
            "The @jsx React.DOM pragma has been deprecated as of React 0.12");
        }
      }
      const jsxFragMatches = JSX_FRAG_ANNOTATION_REGEX.exec(comment.value);
      if (jsxFragMatches) {
        pragmaJsxFrag = jsxFragMatches[1];
      }
    }

    state.set("jsxIdentifier", parseIdentifier(pragmaJsx, t));
    state.set("jsxFragIdentifier", parseJsxIdentifier(pragmaJsxFrag, t));
  };

  return {
    inherits: jsx,
    visitor
  };
}
