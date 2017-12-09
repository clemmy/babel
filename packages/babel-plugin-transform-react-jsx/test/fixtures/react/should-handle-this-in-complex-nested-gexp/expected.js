function root() {
  var _this2 = this;

  function outer() {
    var _this = this;

    React.createElement(
      "div",
      null,
      function () {
        var _yields2 = [];

        _yields2.push(_this);
        _yields2.push(React.createElement(
          "div",
          null,
          function () {
            var _yields = [];
            _yields.push(_this);return _yields;
          }()
        ));
        return _yields2;
      }()
    );
  }
  React.createElement(
    "span",
    null,
    " ",
    function () {
      var _yields3 = [];
      _yields3.push(_this2);return _yields3;
    }(),
    " "
  );
}