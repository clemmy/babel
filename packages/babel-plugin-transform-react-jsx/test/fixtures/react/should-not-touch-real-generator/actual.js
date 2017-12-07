function *x() {
  yield 1;
}
<div>
  *{ 
    function *y() {
      for (var i=0; i<max; ++i) {
        yield i;
      }
    }
    yield 3;
  }
</div>;
