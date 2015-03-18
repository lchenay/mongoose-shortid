var mongoose = require('mongoose');
var ShortId = require('./shortid');
var async = require('async');

var defaultSave = mongoose.Model.prototype.save;
mongoose.Model.prototype.save = function(cb) {


    if (this.isNew) {

        var shortIdKeys = [];
        var retries = {};

        for (key in this.schema.tree) {
            var fieldName = key
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
                async.map(shortIdKeys, function(fieldName, next) {
                    var idInfo = self.schema.path(fieldName);
                    idInfo.generator(idInfo.generatorOptions, function (err, id) {
                        if (err) {
                            next(err);
                            return;
                        }
                        self[fieldName] = id;
                        next();
                    });
                }, function() {
                    defaultSave.call(self, function (err, obj) {
                        for (fieldName in shortIdKeys) {
                            if (err &&
                                err.code == 11000 &&
                                err.err.indexOf(fieldName) !== -1 &&
                                retries[fieldName] > 0
                            ) {
                                --retries[fieldName];
                                attemptSave();
                                return;
                            }
                        }
                        // TODO check these args
                        if (cb) {
                            cb(err, obj);
                        }
                    });
                });
            }

            attemptSave();
            return;
        }
    }
    defaultSave.call(this, cb);
};

module.exports = exports = ShortId;
