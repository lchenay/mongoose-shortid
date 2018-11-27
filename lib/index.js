var mongoose = require('mongoose');
var ShortId = require('./shortid');
var async = require('async');

/**
 * Monkey patch the mongoose save function
 * Because save is now a more complex promise, need to go lower to the internal save
 * Throw on any obvious changes to the internal save prototype
 */
var defaultSaveName = '$__save';
var defaultSave = mongoose.Model.prototype[defaultSaveName];
(function checkDefaultSave() {
  var defaultSaveLength = 2;
  if (typeof defaultSave!=='function') {
    throw new Error('mongoose no longer supports the prototype '+defaultSaveName);
  }
  if (defaultSave.length!==defaultSaveLength) {
    throw new Error('mongoose prototype '+defaultSaveName+' arity has changed from '+defaultSaveLength+' to '+defaultSave.length);
  }
})();


mongoose.Model.prototype[defaultSaveName] = function (options, cb) {
  if (this.isNew) {

    var shortIdKeys = [];
    var retries = {};

    for (var fieldName in this.schema.tree) {
      if (this.isNew && this[fieldName] === undefined) {
        var idType = this.schema.tree[fieldName];

        if (idType === ShortId || idType.type === ShortId) {
          shortIdKeys.push(fieldName);
          retries[fieldName] = this.schema.path(fieldName).retries
        }
      }
    }

    if (shortIdKeys.length > 0) {
      var self = this;

      function attemptSave() {
        async.map(shortIdKeys, function (fieldName, next) {
          var idInfo = self.schema.path(fieldName);
          idInfo.generator(idInfo.generatorOptions, function (err, id) {
            if (err) {
              next(err);
              return;
            }
            self[fieldName] = id;
            next();
          });
        }, function () {
          defaultSave.call(self, options, function (err, obj) {
            let shouldRetry = false;
            for (fieldName in shortIdKeys) {
              if (err &&
                err.code == 11000 &&
                (err.err || err.errmsg || '').indexOf(fieldName) !== -1 &&
                retries[fieldName] > 0
              ) {
                --retries[fieldName];
                shouldRetry = true;
              }
            }
            if (shouldRetry) {
                attemptSave();
                return;
            }
            if (cb) {
              // TODO check these args
              cb(err, obj);
            }
          });
        });
      }

      attemptSave();
      return;
    }
  }
  defaultSave.call(this, options, cb);
};

module.exports = exports = ShortId;
