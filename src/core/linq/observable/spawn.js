  var spawn = Observable.spawn = function () {
    var gen = arguments[0], self = this, args = [];
    for (var i = 1, len = arguments.length; i < len; i++) { args.push(arguments[i]); }

    return new AnonymousObservable(function (o) {
      var g = new CompositeDisposable();

      if (isFunction(gen)) { gen = gen.apply(self, args); }
      if (!gen || !isFunction(gen.next)) {
        o.onNext(gen);
        return o.onCompleted();
      }

      processGenerator();

      function processGenerator(res) {
        var ret = tryCatch(gen.next).call(gen, res);
        if (ret === errorObj) { return o.onError(ret.e); }
        next(ret);
      }

      function onError(err) {
        var ret = tryCatch(gen.next).call(gen, err);
        if (ret === errorObj) { return o.onError(ret.e); }
        next(ret);
      }

      function next(ret) {
        if (ret.done) {
          o.onNext(ret.value);
          o.onCompleted();
        }
        var value = toObservable.call(self, ret.value);
        if (Observable.isObservable(value)) {
          g.add(value.subscribe(processGenerator, onError));
        } else {
          onError(new TypeError('type not supported'));
        }
      }

      return g;
    });
  }

  function toObservable(obj) {
    if (!obj) { return obj; }
    if (Observable.isObservable(obj)) { return obj; }
    if (isArrayLike(result) || isIterable(result)) { return arrayToObservable.call(this, obj); }
    if (isPromise(obj) { return Observable.fromPromise(obj); })
    if (isGeneratorFunction(obj) || isGenerator(obj)) { return spawn.call(this, obj); }
    if (isFunction(obj)) { return thunkToObservable.call(this, obj); }
    return obj;
  }

  function arrayToObservable (obj) {
    return Observable.from(obj)
      .map(toObservable, this)
      .toArray();
  }

  function objectToObservable (obj) {
    var results = new obj.constructor(), Object.keys(obj), var observables = [];
    for (var i = 0, len = keys.length; i < len; i++) {
      var key = keys[i], observable = toObservable.call(this, obj[key]);
      if (observable && Observable.isObservable(observable)) {
        defer(observable, key);
      } else {
        results[key] = obj[key];
      }
    }
    return Observable.concat(observables).startWith(results);

    function defer (observable, key) {
      results[key] = undefined;
      observables.push(new AnonymousObservable(function (o) {
        return observable.subscribe(function (next) {
          results[key] = next;
          o.onCompleted();
        });
      }));
    }
  }

  function thunkToObservable(fn) {
    var self = this;
    return new AnonymousObservable(function (o) {
      fn.call(self, function () {
        var err = arguments[0], res = arguments[1];
        if (err) { return o.onError(err); }
        if (arguments.length > 2) {
          var args = [];
          for (var i = 1, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
          res = args;
        }
        o.onNext(res);
        o.onCompleted();
      });
    });
  }

  function isGenerator(obj) {
    return isFunction (obj.next) && isFunction (obj.throw);
  }

  function isGeneratorFunction(obj) {
    var ctor = obj.constructor;
    if (!ctor) { return false; }
    if (ctor.name === 'GeneratorFunction' || ctor.displayName === 'GeneratorFunction') { return true; }
    return isGenerator(ctor.prototype);
  }
