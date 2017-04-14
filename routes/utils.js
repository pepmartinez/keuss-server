var express = require('express');

function get_router () 
{
  var router = express.Router();
  
  router.get('/ping', function (req, res) {
    if (req.query.delay) {
      setTimeout (function () {res.status(205).send('pong\n')}, req.query.delay);
    }
    else {
      res.send('pong\n');
    }
  });


  router.get('/echo', function (req, res) {
    res.send({
      headers: req.headers,
      query: req.query,
      body: req.body
    });
  });

  router.get('/err', function (req, res) {
    throw Error ('forced error');
  });
  
  return router;
}

module.exports = get_router;

