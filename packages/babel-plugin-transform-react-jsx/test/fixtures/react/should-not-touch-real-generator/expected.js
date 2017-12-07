function* x() {
  yield 1;
}
React.createElement(
  "div",
  null,
  function () {
    var _yields = [];

    function* y() {
      for (var i = 0; i < max; ++i) {
        yield i;
      }
    }
    _yields.push(3);
    return _yields;
  }()
);