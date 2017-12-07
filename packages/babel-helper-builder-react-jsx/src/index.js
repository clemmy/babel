import esutils from "esutils";
import * as t from "babel-types";

type ElementState = {
  tagExpr: Object; // tag node
  tagName?: string; // raw string tag name
  args: Array<Object>; // array of call arguments
  call?: Object; // optional call property that can be set to override the call expression returned
  pre?: Function; // function called with (state: ElementState) before building attribs
  post?: Function; // function called with (state: ElementState) after building attribs
  compat?: Boolean; // true if React is in compat mode
};

const JSX_IDENTIFIER_STACK_KEY = "$$jsx_generator_expression_yield_identifiers";

export default function (opts) {
  let visitor = {};

  visitor.JSXNamespacedName = function (path) {
    throw path.buildCodeFrameError("Namespace tags are not supported. ReactJSX is not XML.");
  };

  visitor.JSXElement = {
    exit(path, file) {
      let callExpr = buildElementCall(path.get("openingElement"), file);

      callExpr.arguments = callExpr.arguments.concat(path.node.children);

      if (callExpr.arguments.length >= 3) {
        callExpr._prettyCall = true;
      }

      path.replaceWith(t.inherits(callExpr, path.node));
    }
  };

  visitor.JSXFragment = {
    exit(path, file) {
      if (opts.compat) {
        throw path.buildCodeFrameError("Fragment tags are only supported in React 16 and up.");
      }

      const callExpr = buildFragmentCall(path.get("openingFragment"), file);

      callExpr.arguments = callExpr.arguments.concat(path.node.children);

      if (callExpr.arguments.length >= 3) {
        callExpr._prettyCall = true;
      }

      path.replaceWith(t.inherits(callExpr, path.node));
    }
  };

  visitor.JSXGeneratorExpressionContainer = {
    enter(path, file) {
      const yieldsIdentifier = path.scope.generateUidIdentifier("yields");
      file.get(JSX_IDENTIFIER_STACK_KEY).push(yieldsIdentifier);
      const blockStatement = path.get("expression");
      const emptyArrayDeclaration = t.variableDeclaration("var", [
        t.variableDeclarator(
          yieldsIdentifier,
          t.arrayExpression()
        )
      ]);
      blockStatement.unshiftContainer("body", emptyArrayDeclaration);
    },
    exit(path, file) {
      const yieldsIdentifier = file.get(JSX_IDENTIFIER_STACK_KEY).pop();
      const returnArray = t.returnStatement(yieldsIdentifier);
      const blockStatement = path.get("expression");
      blockStatement.pushContainer("body", returnArray);

      const wrapperFnc = t.functionExpression(null, [], blockStatement.node, false, false);
      const iffe = t.callExpression(wrapperFnc, []);
      path.replaceWith(iffe, path.node);
    }
  };

  visitor.YieldExpression = {
    exit(path, file) {
      const identifierStack = file.get(JSX_IDENTIFIER_STACK_KEY);
      const yieldsIdentifier = identifierStack.length ? identifierStack[identifierStack.length - 1] : null;

      // if YieldExpression is in generator context, then leave it alone
      const earliestContainerThatAllowsYield = path.find((p) => p.isJSXGeneratorExpressionContainer() || (p.isFunctionDeclaration() && p.node.generator));

      if (yieldsIdentifier && earliestContainerThatAllowsYield.isJSXGeneratorExpressionContainer()) {
        const yieldArg = path.node.argument;
        const pushArgIntoYields = t.expressionStatement(t.callExpression(t.memberExpression(yieldsIdentifier, t.identifier("push")), [yieldArg]));

        path.replaceWith(pushArgIntoYields, path.node);
      }
    }
  };

  return visitor;

  function convertJSXIdentifier(node, parent) {
    if (t.isJSXIdentifier(node)) {
      if (node.name === "this" && t.isReferenced(node, parent)) {
        return t.thisExpression();
      } else if (esutils.keyword.isIdentifierNameES6(node.name)) {
        node.type = "Identifier";
      } else {
        return t.stringLiteral(node.name);
      }
    } else if (t.isJSXMemberExpression(node)) {
      return t.memberExpression(
        convertJSXIdentifier(node.object, node),
        convertJSXIdentifier(node.property, node)
      );
    }

    return node;
  }

  function convertAttributeValue(node) {
    if (t.isJSXExpressionContainer(node)) {
      return node.expression;
    } else {
      return node;
    }
  }

  function convertAttribute(node) {
    let value = convertAttributeValue(node.value || t.booleanLiteral(true));

    if (t.isStringLiteral(value) && !t.isJSXExpressionContainer(node.value)) {
      value.value = value.value.replace(/\n\s+/g, " ");
    }

    if (t.isValidIdentifier(node.name.name)) {
      node.name.type = "Identifier";
    } else {
      node.name = t.stringLiteral(node.name.name);
    }

    return t.inherits(t.objectProperty(node.name, value), node);
  }

  function buildFragmentCall(path, file) {
    path.parent.children = t.react.buildChildren(path.parent);

    const args = [];
    const tagName = null;
    const tagExpr = file.get("jsxFragIdentifier");

    let state: ElementState = {
      tagExpr: tagExpr,
      tagName: tagName,
      args:    args
    };

    args.push(tagExpr);

    // no attributes are allowed with <> syntax
    args.push(t.nullLiteral());

    if (opts.post) {
      opts.post(state, file);
    }

    file.set("usedFragment", true);
    return state.call || t.callExpression(state.callee, args);
  }

  function buildElementCall(path, file) {
    path.parent.children = t.react.buildChildren(path.parent);

    const tagExpr = convertJSXIdentifier(path.node.name, path.node);
    const args = [];

    let tagName;
    if (t.isIdentifier(tagExpr)) {
      tagName = tagExpr.name;
    } else if (t.isLiteral(tagExpr)) {
      tagName = tagExpr.value;
    }

    let state: ElementState = {
      tagExpr: tagExpr,
      tagName: tagName,
      args:    args
    };

    if (opts.pre) {
      opts.pre(state, file);
    }

    let attribs = path.node.attributes;
    if (attribs.length) {
      attribs = buildOpeningElementAttributes(attribs, file);
    } else {
      attribs = t.nullLiteral();
    }

    args.push(attribs);

    if (opts.post) {
      opts.post(state, file);
    }

    return state.call || t.callExpression(state.callee, args);
  }

  /**
   * The logic for this is quite terse. It's because we need to
   * support spread elements. We loop over all attributes,
   * breaking on spreads, we then push a new object containing
   * all prior attributes to an array for later processing.
   */

  function buildOpeningElementAttributes(attribs, file) {
    let _props = [];
    let objs = [];

    let useBuiltIns = file.opts.useBuiltIns || false;
    if (typeof useBuiltIns !== "boolean") {
      throw new Error("transform-react-jsx currently only accepts a boolean option for useBuiltIns (defaults to false)");
    }

    function pushProps() {
      if (!_props.length) return;

      objs.push(t.objectExpression(_props));
      _props = [];
    }

    while (attribs.length) {
      let prop = attribs.shift();
      if (t.isJSXSpreadAttribute(prop)) {
        pushProps();
        objs.push(prop.argument);
      } else {
        _props.push(convertAttribute(prop));
      }
    }

    pushProps();

    if (objs.length === 1) {
      // only one object
      attribs = objs[0];
    } else {
      // looks like we have multiple objects
      if (!t.isObjectExpression(objs[0])) {
        objs.unshift(t.objectExpression([]));
      }

      const helper = useBuiltIns ?
        t.memberExpression(t.identifier("Object"), t.identifier("assign")) :
        file.addHelper("extends");

      // spread it
      attribs = t.callExpression(helper, objs);
    }

    return attribs;
  }
}
