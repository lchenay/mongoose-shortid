'use strict';

require('should');

var async = require('async');
var mongoose = require('mongoose');
var shortIdModule = require('shortid');

var ShortId = require('../index');


mongoose.connect('mongodb://localhost/test');

var Schema = mongoose.Schema;

var defaultSchema = new Schema({
    _id: ShortId,
    num: Number
});

var alphaSchema = new Schema({
    _id: {
        type: ShortId,
        len: 2,
        alphabet: 'abc',
        retries: 10
    },
    num: Number
});

var generatorSchema = new Schema({
    _id: {
        type: ShortId,
        generator: function(options, callback) {
            callback(null, ''+Date.now());
        }
    },
    num: Number
});

var shortIdModuleSchema = new Schema({
    _id: {
        type: ShortId,
        generator: function(options, callback) {
            callback(null, shortIdModule.generate());
        }
    },
    num: Number
});

var DefaultDoc = mongoose.model('defaultdoc', defaultSchema);
var AlphaDoc = mongoose.model('alphadoc', alphaSchema);
var GeneratorDoc = mongoose.model('generatordoc', generatorSchema);
var ShortIdModuleDoc = mongoose.model('shortidmoduledoc', shortIdModuleSchema);

describe('shortid', function() {

    this.timeout(10000);

    before(function(done) {

        async.each([DefaultDoc, AlphaDoc, GeneratorDoc, ShortIdModuleDoc], function(model, eachNext) {
            model.remove(eachNext);
        }, function(err) {
            done(err);
        });

    });

    describe('defaults', function () {
        it('should generate base 64 unique ids 7 characters long', function (done) {

            var idsToGenerate = 1000;
            var ids = {};
            var i = 0;

            async.whilst(function() {return i++ < idsToGenerate;}, function(whilstNext) {
                var doc = new DefaultDoc({num: i});
                doc.save(function(err, doc) {
                    if (!err) {
                        var currId = doc._id;
                        currId.length.should.equal(7);
                        currId.length.should.match(/^[\w\d\-]+$/);
                        ids[doc._id] = true;
                    }
                    whilstNext(err);
                });
            }, function(err) {
                Object.keys(ids).length.should.equal(idsToGenerate);
                done(err);
            });
        });
    });

    describe('custom length and alphabet', function () {
        it('should respect len and alphabet options', function (done) {

            var idsToGenerate = 20;
            var ids = {};
            var numDups = 0;
            var i = 0;

            async.whilst(function() {return i++ < idsToGenerate;}, function(whilstNext) {
                var doc = new AlphaDoc({num: i});
                doc.save(function(err, doc) {
                    if (!err) {
                        var currId = doc._id;
                        currId.length.should.equal(2);
                        currId.length.should.match(/^[abc]+$/);
                        ids[doc._id] = true;
                    } else if (err.code === 11000) {
                        numDups += 1;
                        err = null;
                    }
                    whilstNext(err);
                });
            }, function(err) {
                Object.keys(ids).length.should.equal(9);
                numDups.should.equal(11);
                done(err);
            });
        });
    });

    describe('custom generator', function () {

        it('should use simple custom generator', function (done) {

            var idsToGenerate = 20;
            var ids = {};
            var lastIdNum = 0;
            var i = 0;

            async.whilst(function() {return i++ < idsToGenerate;}, function(whilstNext) {
                var doc = new GeneratorDoc({num: i});
                doc.save(function(err, doc) {
                    if (!err) {
                        var currId = doc._id;
                        currId.length.should.match(/^\d+$/);
                        ids[doc._id] = true;
                        var currIdNum = parseInt(currId, 10);
                        currIdNum.should.be.greaterThan(lastIdNum);
                        lastIdNum = currIdNum;
                    }
                    whilstNext(err);
                });
            }, function(err) {
                Object.keys(ids).length.should.equal(idsToGenerate);
                if (err) {
                    console.error("ERROR", err);
                }
                done(err);
            });
        });

        it('should work shortid npm module', function (done) {

            var idsToGenerate = 1000;
            var ids = {};
            var i = 0;

            async.whilst(function() {return i++ < idsToGenerate;}, function(whilstNext) {
                var doc = new ShortIdModuleDoc({num: i});
                doc.save(function(err, doc) {
                    if (!err) {
                        var currId = doc._id;
                        currId.length.should.be.lessThan(15);
                        currId.length.should.match(/^[\w\d\-]+$/);
                        ids[doc._id] = true;
                    }
                    whilstNext(err);
                });
            }, function(err) {
                Object.keys(ids).length.should.equal(idsToGenerate);
                done(err);
            });
        });
    });
});
