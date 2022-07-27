const express =    require ('express');
const _ =          require ('lodash');
const bodyParser = require ('body-parser');

const Exchange = require ('../lib/exchange/Exchange');


//////////////////////////////////////////////////////////////////////////////////////
function _list_exchanges_tree (scope, req, res) {
  const ret = {};

  _.each (scope.exchanges(), (v, k) => {
    ret[k] = v.status ();
  });

  res.send(ret);
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_exchanges_array (scope, req, res) {
  const ret = [];

  _.each (scope.exchanges(), (v, k) => {
    const st = v.status ()
    st.id = k;
    ret.push (st);
  });

  res.send({
    data: ret
  });
}


//////////////////////////////////////////////////////////////////////////////////////
function _list_exchanges (scope, req, res) {
  if (req.query.array) {
    _list_exchanges_array(scope, req, res);
  } else {
    _list_exchanges_tree(scope, req, res);
  }
}


//////////////////////////////////////////////////////////////////////////////////////
function _reload_list_exchanges (scope, req, res) {
  scope.refresh(() => _list_exchanges(scope, req, res));
}


//////////////////////////////////////////////////////////////////////////////////////
function get_router(config, context) {
  var scope = context.scope;

  //////////////////////////////////////////////////////////////////////////////////////
  function _get_exchanges (req, res) {
    if (req.query.reload) {
      _reload_list_exchanges(scope, req, res);
    } else {
      _list_exchanges(scope, req, res);
    }
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _get_exchange_status (req, res) {
    res.send (req.__exchange.status());
  }


  //////////////////////////////////////////////////////////////////////////////////////
  function _create_exchange (req, res) {
    const x_name = req.params.X;
    const config = req.body;

    try {
      scope.notify_creation_of_exchange ({name: x_name, decl: config});
      res.status (201).send ();
    }
    catch (re) {
      res.status (re.c || 500).send (re.t || re.toString ());
    }
  }


  //////////////////////////////////////////////////////////////////////////////////////
  var router = express.Router();


  router.param ('x', (req, res, next, exchange) => {
    const __exchange = scope.exchange(exchange);
    if (!__exchange) {
      res.status(404).send('no such exchange [' + exchange + ']');
    } else {
      req.__exchange = __exchange;
      next();
    }
  });

  const json_mw = bodyParser.json ();

  router.get  ('/',              _get_exchanges);
  router.get  ('/:x',            _get_exchange_status);
  router.post ('/:X', [json_mw], _create_exchange);
  router.put  ('/:X', [json_mw], _create_exchange);

  return router;
}

module.exports = get_router;
