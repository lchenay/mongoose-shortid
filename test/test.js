'use strict';

require('should');

var async = require('async');
var mongoose = require('mongoose');

var ShortId = require('../index');

mongoose.connect('mongodb://localhost/test');

var Schema = mongoose.Schema;

var defaultSchema = new Schema({
    _id: ShortId,
    num: Number
});

var optionSchema = new Schema({
    _id: {
        type: ShortId,
        len: 2,
        alphabet: 'abc',
        retries: 10
    },
    num: Number
});

var DefaultDoc = mongoose.model('defaultdoc', defaultSchema);
var OptionsDoc = mongoose.model('optionsdoc', optionSchema);

describe('shortid', function() {

    this.timeout(60000);

    before(function(done) {

        async.each([DefaultDoc, OptionsDoc], function(model, eachNext) {
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

    describe('options', function () {
        it('should respect len and alphabet options', function (done) {

            var idsToGenerate = 20;
            var ids = {};
            var numDups = 0;
            var i = 0;

            async.whilst(function() {return i++ < idsToGenerate;}, function(whilstNext) {
                var doc = new OptionsDoc({num: i});
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
});
