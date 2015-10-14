'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var helpers = require('yeoman-generator').test;
var test = require('tape');

test('swagger-express generator', function(t) {
    var app, appName, testDir;

    appName = 'swagapp';
    testDir = path.join(os.tmpdir(), appName);

    function setup(done) {

        helpers.testDirectory(testDir, function(err) {
            if (err) {
                return done(err);
            }

            app = helpers.createGenerator('swaggerize:app', [
                path.join(__dirname, '../app')
            ]);

            done();
        });
    }

    t.test('yaml api (default express)', function(t) {

        setup(function() {
            var expected = [
                '.jshintrc',
                '.gitignore',
                '.npmignore',
                'README.md',
                'server.js',
                'package.json',
                'tests',
                'tests/test_petsByID.js',
                'tests/test_pets.js',
                'config',
                'config/pets.yaml',
                'handlers',
                'handlers/petsByID.js',
                'handlers/pets.js',
                'models',
                'models/error.js',
                'models/pet.js'
            ];

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });

            app.options['skip-install'] = true;

            app.run(function() {
                expected.forEach(function(file) {
                    t.ok(fs.existsSync(path.join(testDir, file)), 'file exists.');
                });
                t.end();
            });
        });
    });

    t.test('creates expected files (hapi)', function(t) {

        setup(function() {
            var expected = [
                '.jshintrc',
                '.gitignore',
                '.npmignore',
                'README.md',
                'server.js',
                'package.json',
                'tests',
                'tests/test_pets_{id}.js',
                'tests/test_pets.js',
                'config',
                'config/pets.json',
                'handlers',
                'handlers/pets',
                'handlers/pets/{id}.js',
                'handlers/pets.js',
                'models',
                'models/error.js',
                'models/pet.js'
            ];

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.json'),
                'framework': 'hapi'
            });

            app.options['skip-install'] = true;

            app.run(function() {
                expected.forEach(function(file) {
                    t.ok(fs.existsSync(path.join(testDir, file)), 'file exists.');
                });
                t.end();
            });
        });
    });

    t.test('supports url', function(t) {
        t.plan(1);

        setup(function() {

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': 'https://raw.githubusercontent.com/wordnik/swagger-spec/master/examples/v2.0/json/petstore.json',
                'framework': 'hapi'
            });

            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.ok(fs.existsSync(app.config.get('apiPath')), 'file exists.');
            });
        });
    });

    t.test('supports --only (all)', function(t) {

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });

            app.options['dry-run'] = true;
            app.options['only'] = 'tests,handlers,models';

            app.run(function() {
                t.ok(!app.config.get('genProject'), 'project generation disabled');
                t.ok(app.config.get('genModels'), 'model generation enabled');
                t.ok(app.config.get('genHandlers'), 'handler generation enabled');
                t.ok(app.config.get('genTests'), 'test generation enabled');
                t.end();
            });
        });
    });

    t.test('supports --only models', function(t) {

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });

            app.options['dry-run'] = true;
            app.options['only'] = 'models';

            app.run(function() {
                t.ok(!app.config.get('genProject'), 'project generation disabled');
                t.ok(app.config.get('genModels'), 'model generation enabled');
                t.ok(!app.config.get('genHandlers'), 'handler generation disabled');
                t.ok(!app.config.get('genTests'), 'test generation disabled');
                t.end();
            });
        });
    });

    t.test('supports --only handlers', function(t) {

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });

            app.options['dry-run'] = true;
            app.options['only'] = 'handlers';

            app.run(function() {
                t.ok(!app.config.get('genProject'), 'project generation disabled');
                t.ok(!app.config.get('genModels'), 'model generation disabled');
                t.ok(app.config.get('genHandlers'), 'handler generation enabled');
                t.ok(!app.config.get('genTests'), 'test generation disabled');
                t.end();
            });
        });
    });

    t.test('supports --only tests', function(t) {

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });

            app.options['dry-run'] = true;
            app.options['only'] = 'tests';

            app.run(function() {
                t.ok(!app.config.get('genProject'), 'project generation disabled');
                t.ok(!app.config.get('genModels'), 'model generation disabled');
                t.ok(!app.config.get('genHandlers'), 'handler generation disabled');
                t.ok(app.config.get('genTests'), 'test generation enabled');
                t.end();
            });
        });
    });

    t.test('discover framework (express) from package.json', function(t) {
        t.plan(1);

        setup(function() {
            app.fs.write(app.destinationPath('package.json'),
                '{ "dependencies": {"express": "*"} }'
            );

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });
            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.equal(app.config.get('framework'), 'express', 'framework from package.json');
            });

        });
    });

    t.test('discover framework (restify) from package.json', function(t) {
        t.plan(1);

        setup(function() {
            app.fs.write(app.destinationPath('package.json'),
                '{ "dependencies": {"restify": "*"} }'
            );

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });
            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.equal(app.config.get('framework'), 'restify', 'framework from package.json');
            });

        });
    });

    t.test('discover framework (hapi) from package.json', function(t) {
        t.plan(1);

        setup(function() {
            app.fs.write(app.destinationPath('package.json'),
                '{ "dependencies": {"hapi": "*"} }'
            );

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });
            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.equal(app.config.get('framework'), 'hapi', 'framework from package.json');
            });

        });
    });

    t.test('no supported framework package.json', function(t) {
        t.plan(1);

        setup(function() {
            app.fs.write(app.destinationPath('package.json'),
                '{ "dependencies": {"fake": "*"} }'
            );

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null
            });
            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.equal(app.config.get('framework'), 'express', 'framework from package.json');
            });

        });
    });

    t.test('mongoose database enabled', function(t) {

        setup(function() {
            var expected = [
                '.jshintrc',
                '.gitignore',
                '.npmignore',
                'README.md',
                'server.js',
                'package.json',
                'tests',
                'tests/test_petsByID.js',
                'tests/test_pets.js',
                'config',
                'config/pets.yaml',
                'handlers',
                'handlers/petsByID.js',
                'handlers/pets.js',
                'models',
                'models/error.js',
                'models/pet.js'
            ];

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null,
                'database': 'db'
            });

            app.run(function() {
                expected.forEach(function(file) {
                    t.ok(fs.existsSync(path.join(testDir, file)), 'file exists.');

                    if (file === 'tests/test_petsByID.js') {
                        t.ok(require(path.resolve(process.cwd(), path.join(testDir, file))), 'generated test passes');
                    }
                });
                t.end();
            });
        });
    });

    t.test('mongoose database enabled (dry-run)', function(t) {
        t.plan(1);

        setup(function() {

            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.yaml'),
                'framework': null,
                'database': 'db'
            });

            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.run(function() {
                t.ok(fs.existsSync(app.config.get('apiPath')), 'file exists.');
            });
        });
    });

    t.test('bad framework', function(t) {
        t.plan(1);

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/pets.json'),
                'framework': 'foobar'
            });

            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.on('error', function(err) {
                t.equal(err.name, 'Error', 'throws error.');
            });

            app.run();
        });
    });

    t.test('bad api', function(t) {
        t.plan(1);

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': path.join(__dirname, 'fixtures/badapi.json'),
                'framework': null
            });

            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.on('error', function(err) {
                t.equal(err.name, 'ValidationError', 'throws validation error.');
            });

            app.run();
        });
    });

    t.test('no api', function(t) {
        t.plan(1);

        setup(function() {
            helpers.mockPrompt(app, {
                'appname': appName,
                'apiPath': null,
                'framework': null
            });

            app.options['skip-install'] = true;
            app.options['dry-run'] = true;

            app.on('error', function(err) {
                t.equal(err.name, 'Error', 'throws error.');
            });

            app.run();
        });
    });

});