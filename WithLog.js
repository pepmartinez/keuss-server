'use strict';

var _ = require ('lodash');

const LEVELS = { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }

class WithLog {
  //////////////////////////////////////////////
  constructor (opts) {
    //////////////////////////////////////////////
    // original opts
    this._opts = opts || {};
    
    this._name = this._opts.name; 
    this._logger = this._opts.logger;
    this._level = this._opts.level || LEVELS.verbose;
  }
  
  logger () {return this._logger}  
  level ()  {return this._level}  
  
  setLevel (l) {
    var lvl = LEVELS [l];
    if (_.isNumber (lvl)) this._level = lvl;
  }
  
  _header () {
    if (this.type) {
      return '[' + this.type() + '][' + this._name + ']';
    }
    
    return '[' + this._name + ']';
  }
  
  _do_log (lvl, args) {
    if (this._name) {
      if (_.isString (args[0])) {
        args[0] = this._header() + ' ' + args[0];
      }
      else {
        args.unshift (this._header());
      }
    }
    
    this._logger[lvl].apply (this._logger, args);
  }
  
  _silly () {
    if (this._level < LEVELS.silly) return;
    if (!this._logger) return;
    
    this._do_log ('silly', arguments);
  }
  
  _debug () {
    if (this._level < LEVELS.debug) return;
    if (!this._logger) return;
    
    this._do_log ('debug', arguments);
  }
  
  _verbose () {
    if (this._level < LEVELS.verbose) return;
    if (!this._logger) return;
    
    this._do_log ('verbose', arguments);
  }
  
  _info () {
    if (this._level < LEVELS.info) return;
    if (!this._logger) return;
    
    this._do_log ('info', arguments);
  }
  
  _warn () {
    if (this._level < LEVELS.warn) return;
    if (!this._logger) return;
    
    this._do_log ('warn', arguments);
  }
  
  _error () {
    if (this._level < LEVELS.error) return;
    if (!this._logger) return;
    
    this._do_log ('error', arguments);
  }
}

module.exports = WithLog;
