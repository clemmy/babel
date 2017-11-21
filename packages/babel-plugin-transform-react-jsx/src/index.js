/* eslint max-len: 0 */

const FEATURE_FLAG_JSX_FRAGMENT = true;

export default function ({ types: t }) {
  const JSX_ANNOTATION_REGEX = /\*?\s*@jsx\s+([^\s]+)/;
  const JSX_FRAG_ANNOTATION_REGEX = /\*?\s*@jsxFrag\s+([^\s]+)/;

  const parseIdentifier = (id: string) => {
    return id.split(".")
      .map((name) => t.identifier(name))
      .reduce((object, property) => t.memberExpression(object, property));
  };

  let visitor = require("babel-helper-builder-react-jsx")({
    pre(state) {
      let tagName = state.tagName;
      let args    = state.args;
      if (t.react.isCompatTag(tagName)) {
        args.push(t.stringLiteral(tagName));
      } else {
        args.push(state.tagExpr);
      }
    },

    post(state, pass) {
      state.callee = pass.get("jsxIdentifier");
    }
  });

  if (FEATURE_FLAG_JSX_FRAGMENT) {
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

        // the functions are passed so the same node isn't reused
        state.set("jsxIdentifier", parseIdentifier(pragma));
        state.set("jsxFragIdentifier", parseIdentifier(pragmaFrag));

        state.set("usedFragment", false);
        state.set("pragmaSet", pragmaSet);
        state.set("pragmaFragSet", pragmaFragSet);
      },
      exit(path, state) {
        if (
          state.get("pragmaSet") &&
          state.get("usedFragment") &&
          !state.get("pragmaFragSet")
        ) {
          throw new Error("transform-react-jsx: pragma has been set but " +
            "pragmafrag has not been set");
        }
      }
    };
  } else {
    visitor.Program = function (path, state) {
      let { file } = state;
      let id = state.opts.pragma || "React.createElement";

      for (let comment of (file.ast.comments: Array<Object>)) {
        let matches = JSX_ANNOTATION_REGEX.exec(comment.value);
        if (matches) {
          id = matches[1];
          if (id === "React.DOM") {
            throw file.buildCodeFrameError(comment, "The @jsx React.DOM pragma has been deprecated as of React 0.12");
          } else {
            break;
          }
        }
      }

      state.set("jsxIdentifier", parseIdentifier(id));
    };
  }
  return {
    inherits: require("babel-plugin-syntax-jsx"),
    visitor
  };
}
