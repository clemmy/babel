# babel-plugin-transform-react-jsx

> Turn JSX into React function calls

## Example

### React

**In**

```javascript
var profileFrag = <>
  <img src="avatar.png" className="profile" />
  <h3>{[user.firstName, user.lastName].join(' ')}</h3>
</>;
```

**Out**

```javascript
var profileFrag = React.createElement(React.Fragment, null,
  React.createElement("img", { src: "avatar.png", className: "profile" }),
  React.createElement("h3", null, [user.firstName, user.lastName].join(" "))
);
```

### Custom

**In**

```javascript
/** @jsx dom */
/** @jsxFrag DomFrag */

var { dom, DomFrag } = require("deku");

var profileFrag = <>
  <img src="avatar.png" className="profile" />
  <h3>{[user.firstName, user.lastName].join(' ')}</h3>
</>;
```

**Out**

```javascript
/** @jsx dom */
/** @jsxFrag DomFrag */

var { dom, DomFrag } = require("deku");

var profileFrag = dom(DomFrag, null,
  dom("img", { src: "avatar.png", className: "profile" }),
  dom("h3", null, [user.firstName, user.lastName].join(" "))
);
```

## Installation

```sh
$ npm install babel-plugin-transform-react-jsx
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```js
// without options
{
  "plugins": ["transform-react-jsx"]
}
// with options
{
  "plugins": [
    ["transform-react-jsx", {
      "pragma": "dom", // default is React.createElement
      "pragmaFrag": "DomFrag", // default is React.Fragment
    }]
  ]
}
```

### Via CLI

```sh
$ babel --plugins transform-react-jsx script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["transform-react-jsx"]
});
```

## Options

### `pragma`

`string`, defaults to `React.createElement`.

Replace the function used when compiling JSX expressions.

Note that the `@jsx React.DOM` pragma has been deprecated as of React v0.12

### `pragmaFrag`

`string`, defaults to `React.Fragment`.

Replace the component used when compiling JSX fragments.
