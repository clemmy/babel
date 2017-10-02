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
      state.jsxIdentifier = pass.get("jsxIdentifier")();
    }
  });

  visitor.Program = {
    enter(path, state) {
      const { file } = state;

      let pragma = state.opts.pragma || "React.createElement";
      let pragmaFrag = state.opts.pragmaFrag || "React.Fragment";
      let pragmaSet = !!state.opts.pragma;
      let pragmaFragSet = !!state.opts.pragmaFrag;

      for (const comment of (file.ast.comments: Array<Object>)) {
        const jsxMatches = JSX_ANNOTATION_REGEX.exec(comment.value);
        if (jsxMatches) {
          pragma = jsxMatches[1];
          pragmaSet = true;
          if (pragma === "React.DOM") {
            throw file.buildCodeFrameError(comment,
              "The @jsx React.DOM pragma has been deprecated as of React 0.12");
          }
        }
        const jsxFragMatches = JSX_FRAG_ANNOTATION_REGEX.exec(comment.value);
        if (jsxFragMatches) {
          pragmaFrag = jsxFragMatches[1];
          pragmaFragSet = true;
        }
      }

      state.set("jsxIdentifier", () => parseIdentifier(pragma, t));
      state.set("jsxFragIdentifier", () => parseJsxIdentifier(pragmaFrag, t));
      state.set("usedFragment", false);
      state.set("pragmaSet", pragmaSet);
      state.set("pragmaFragSet", pragmaFragSet);
    },
    exit(path, state) {
      const pragmaSet = state.get("pragmaSet");
      const pragmaFragSet = state.get("pragmaFragSet");
      const usedFragment = state.get("usedFragment");

      if (pragmaSet && usedFragment && !pragmaFragSet) {
        throw new Error("transform-react-jsx: pragma has been set but " +
          "pragmafrag has not been set");
      }
    }
  };

  return {
    inherits: jsx,
    visitor
  };
}
