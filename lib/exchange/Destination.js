const _ =        require ('lodash');
const evaluate = require ('static-eval');
const parse =    require ('esprima').parse;


class Destination {
  ///////////////////////////////////////////
  constructor (name, q, selector, logger) {
    this._name = name || q.name ();
    this._q = q;
    this._selector_raw = selector;
    this._logger = logger;

    if (selector) {
      if (_.isFunction (selector)) {
        this._sel = selector;
      }
      else if (_.isString (selector)) {
        this._logger.verbose ('Destination [%s]: parsing selector [%s]', this._name, selector);

        try {
          const ast = parse (selector).body[0].expression;
          this._sel = (env => evaluate (ast, {env}));
        }
        catch (e) {
          throw new Error (`parse error in line ${e.lineNumber}, pos ${e.index} : ${e.description}`);
        }
      }
    }

    this._logger.verbose ('Destination [%s]: created', this._name);
  }


  ///////////////////////////////////////////
  apply (item, cb) {
    let really_apply = (!this._sel);

    if (this._sel) {
      try {
        really_apply = this._sel ({msg: item});
      }
      catch (e) {
        this._logger.error ('Destination [%s]: error on selector exec: %s', this._name, e.toString ());
        really_apply = false;
      }
    }

    if (really_apply) {
      this._logger.verbose ('Destination [%s]: really apply', this._name);
      this._q.push (item.payload, {hdrs: item.hdrs /* TODO: extra push options? */}, err => cb (err, really_apply));
    }
    else {
      this._logger.verbose ('Destination [%s]: ignore apply', this._name);
      setImmediate (() => cb (null, really_apply));
    }
  }


  ///////////////////////////////////////////
  name () {return this._name;}
}


module.exports = Destination;
