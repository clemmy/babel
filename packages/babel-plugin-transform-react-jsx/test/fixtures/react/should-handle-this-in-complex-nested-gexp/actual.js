function root() {
  function outer() {
    <div>
      *{
        yield this;
        yield (
          <div>
            *{ yield this; }
          </div>
        );
      }
    </div>;
  }
  <span> *{ yield this; } </span>
}
