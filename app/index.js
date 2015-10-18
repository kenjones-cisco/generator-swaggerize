'use strict';

var util = require('util'),
    url = require('url'),
    os = require('os'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    mkdirp = require('mkdirp'),
    generators = require('yeoman-generator'),
    jsYaml = require('js-yaml'),
    apischema = require('swagger-schema-official/schema'),
    builderUtils = require('swaggerize-routes/lib/utils'),
    pluralize = require('pluralize'),
    enjoi = require('enjoi'),
    gulpif = require('gulp-if'),
    beautify = require('gulp-beautify'),
    us = require('underscore.string'),
    update = require('./update');

var debug = require('debuglog')('generator-swaggerize');
var FRAMEWORKS = ['express', 'hapi', 'restify'];

module.exports = generators.Base.extend({
    initializing: {
        init: function () {
            this.argument('name', { type: String, required: false });

            this.option('dry-run', {
                type: Boolean,
                desc: 'Do not make changes just display changes that would have been made',
                defaults: false
            });
            this.option('only', {
                type: String,
                desc: 'Generate only these types comma-separated: [handlers, models, tests]'
            });
            this.option('framework', {
                type: String,
                desc: 'specify REST framework [express, hapi, restify]'
            });
            this.option('apiPath', {
                type: String,
                desc: 'specifiy local path or URL of Swagger API spec'
            });
            this.option('database', {
                type: String,
                desc: 'The database name to use with mongoose'
            });

            this.log('Swaggerize Generator');

        }
    },

    prompting: {
        askAppNameEarly: function () {
            if (this.name) {
                debug("name provided on CLI %s", this.name);
                return;
            }

            var next = this.async();

            // Handle setting the root early, so .yo-rc.json ends up the right place.
            this.prompt([{
                message: 'Project Name',
                name: 'name',
                default: this.appname
            }], function (props) {
                debug("default appname was: %s", this.appname);
                debug("appname provided: %s", props.name);
                this.name = props.name;
                next();
            }.bind(this));
        },

        setAppName: function () {
            var oldRoot = this.destinationRoot();
            debug("oldRoot: %s appName: %s", oldRoot, this.name);
            this.appname = this.name;
            if (path.basename(oldRoot) !== this.appname) {
                this.destinationRoot(path.join(oldRoot, this.appname));
                debug("updated destinationRoot to %s", this.destinationRoot());
            }
            this.appRoot = this.destinationRoot();
            debug("Project %s base path %s", this.appname, this.appRoot);
        },

        setDefaults: function() {
            var genTypes, githubUser;
            var options = this.options;

            if (options['dry-run']) {
                this.log("Running in dry-run mode");
            }

            githubUser = '';
            if (this.user.git.email()) {
                // requires user's email address to user service
                githubUser = this.user.github.username();
            }
            this.config.defaults({
                appname: this.appname,
                slugName: us.slugify(this.appname),
                creatorName: this.user.git.name(),
                email: this.user.git.email(),
                githubUser: githubUser,
                framework: options.framework,
                apiPath: options.apiPath,
                database: options.database,
                genProject: true,
                genModels: true,
                genHandlers: true,
                genTests: true
            });

            if (options.only) {
                debug("only option provided: %s", options.only);
                // existing project so no need to generate the project parts again
                this.config.set('genProject', false);
                this.log("project generation disabled");

                genTypes = options.only.split(',');
                if (!~genTypes.indexOf('handlers')) {
                    this.config.set('genHandlers', false);
                    this.log("hander generation disabled");
                }
                if (!~genTypes.indexOf('models')) {
                    this.config.set('genModels', false);
                    this.log("models generation disabled");
                }
                if (!~genTypes.indexOf('tests')) {
                    this.config.set('genTests', false);
                    this.log("test generation disabled");
                }
            }

        },

        checkPackage: function checkPackage() {
            var pkg;

            if (this.fs.exists(path.resolve('package.json'))) {
                debug("found existing package.json");
                pkg = this.fs.readJSON(path.resolve('package.json'));
                if (pkg.dependencies.hapi) {
                    debug("setting framework to hapi from package.json");
                    this.config.set('framework', 'hapi');
                } else if (pkg.dependencies.restify) {
                    debug("setting framework to restify from package.json");
                    this.config.set('framework', 'restify');
                } else if (pkg.dependencies.express) {
                    debug("setting framework to express from package.json");
                    this.config.set('framework', 'express');
                }

            }

        },

        askFor: function askFor() {
            var self = this;
            var next = self.async();

            var prompts = [
                {
                    message: 'Path (or URL) to swagger document',
                    name: 'apiPath',
                    type: 'input',
                    when: function () {
                        return !self.config.get('apiPath');
                    }
                },

                {
                    message: 'Rest Framework',
                    name: 'framework',
                    type: 'input',
                    default: 'express',
                    when: function () {
                        return !self.config.get('framework');
                    },
                    choices: FRAMEWORKS
                },

                {
                    message: 'The database name to use with mongoose',
                    name: 'database',
                    type: 'input',
                    when: function () {
                        return !self.config.get('database');
                    }
                }

            ];

            self.prompt(prompts, function (answers) {
                for (var key in answers) {
                    debug("prompt results: %s =>", key, answers[key]);
                    if (typeof answers[key] !== 'undefined' && answers[key] !== null) {
                        debug("setting key value: %s", key);
                        self.config.set(key, answers[key]);
                    }
                }

                next();
            }.bind(this));

            self.config.save();
        },

        validateConfigs: function () {
            debug("framework = %s", this.config.get('framework'));
            if (!this.config.get('framework') || !~FRAMEWORKS.indexOf(this.config.get('framework'))) {
                this.env.error(new Error('missing or invalid required input `framework`'));
            }
        }
    },

    writing: {
        copyLocal: function () {
            var apiSrc, apiSrcPath, apiDestPath, apiPath;

            apiSrcPath = findFile(this.config.get('apiPath'), this.env.cwd, this.appRoot);
            debug("apiPath is file: %s", apiSrcPath);
            if (!apiSrcPath) {
                this.env.error(new Error('missing or invalid required input `apiPath`'));
            }

            if (this._isRemote(apiSrcPath)) {
                return;
            }

            apiDestPath = this._prepareDest();
            apiSrc = path.resolve(apiSrcPath);
            apiPath = path.join(apiDestPath, path.basename(apiSrc));

            this.copy(apiSrc, apiPath);
            this.log.ok("API Spec %s written", apiPath);
            this.config.set('apiPath', apiPath);

        },

        copyRemote: function () {
            var apiSrc, apiSrcPath, apiDestPath, apiPath, done, self;

            apiSrcPath = this.config.get('apiPath');
            debug("apiPath is URL: %s", apiSrcPath);

            if (!this._isRemote(apiSrcPath)) {
                return;
            }

            self = this;
            done = self.async();

            apiDestPath = this._prepareDest();
            apiSrc = url.parse(apiSrcPath).pathname;
            apiPath = path.join(apiDestPath, path.basename(apiSrc));

            self.fetch(apiSrcPath, apiDestPath, function (err) {
                if (err) {
                    // safely exit based on the provided error
                    // no need to call done as this will exit the program.
                    self.env.error(err);
                }
                self.log.ok("API Spec %s written", apiPath);
                self.config.set('apiPath', apiPath);
                done();
            });

        },

        validateSpec: function () {
            var self, done;

            self = this;
            self.api = loadApi(self.config.get('apiPath'), self.read(self.config.get('apiPath')));

            done = self.async();
            enjoi(apischema).validate(self.api, function (error, value) {
                if (error) {
                    // safely exit based on the provided error
                    // no need to call done as this will exit the program.
                    self.env.error(error);
                }
                self.log.ok("API Spec is valid");
                done();
            });
        },

        app: function () {
            if (!this.config.get('genProject')) {
                debug("skipping project generation");
                return;
            }

            if (this.options['dry-run']) {
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, '.jshintrc'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, '.gitignore'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, '.npmignore'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, 'package.json'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, 'README.md'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, 'server.js'));
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, 'config', 'logger.js'));
                return;
            }

            debug("generating base application structure");
            this.copy('jshintrc', '.jshintrc');
            this.copy('gitignore', '.gitignore');
            this.copy('npmignore', '.npmignore');
            this.copy('_logger.js', path.join(this.appRoot, 'config', 'logger.js'));

            this.template('_package.json', 'package.json', this.config.getAll());
            this.template('_README.md', 'README.md', {api: this.api, slugName: this.config.get('slugName')});

            this.template('server_' + this.config.get('framework') + '.js', 'server.js', {
                apiPath: path.relative(this.appRoot, this.config.get('apiPath')),
                database: this.config.get('database')
            });
        },

        database: function () {
            if (!this.config.get('database')) {
                debug("skipping database setup generation");
                return;
            }

            if (this.options['dry-run']) {
                this.log.ok("(DRY-RUN) %s written", path.join(this.appRoot, 'config', 'db.js'));
                return;
            }

            debug("generating database configuration files");
            this.template('_config_db.js', path.join('config', 'db.js'),
                {database: this.config.get('database')});
        },

        models: function () {
            var self = this;
            var models = {};

            if (!self.config.get('genModels')) {
                debug("skipping api models generation");
                return;
            }

            if (!self.options['dry-run']) {
                mkdirp.sync(path.join(self.appRoot, 'models'));
            }

            Object.keys(this.api.definitions).forEach(function (modelName) {
                var model;

                model = self.api.definitions[modelName];
                if (model['x-parent']) {
                    debug("parent: %s", model['x-parent']);
                    // if we have a parent then let our parent handle our setup.
                    return;
                }
                model.id = modelName;
                // provides access to lodash within the template
                model._ = _;
                model.children = {};

                if (model['x-children']) {
                    debug("children: %s",model['x-children']);
                    _.forEach(model['x-children'], function (childName, key) {
                        debug("childName: %s", childName);
                        model.children[childName] = self.api.definitions[childName];
                    });
                }

                models[modelName] = model;
            });

            Object.keys(models).forEach(function (modelName) {
                var file, fileName, model;

                model = models[modelName];
                fileName = modelName.toLowerCase() + '.js';
                file = path.join(self.appRoot, 'models', fileName);
                if (self.config.get('database')) {
                    debug("generating mongoose enabled models");
                    if (!self.options['dry-run']) {
                        self.template('_model_mongoose.js', file, model);
                    } else {
                        self.log.ok("(DRY-RUN) (db) model %s generated", file);
                    }
                } else {
                    debug("generating basic models");
                    if (!self.options['dry-run']) {
                        self.template('_model.js', file, model);
                    } else {
                        self.log.ok("(DRY-RUN) model %s generated", file);
                    }
                }
            });
        },

        handlers: function () {
            var routes, self;

            if (!this.config.get('genHandlers')) {
                debug("skipping api handlers generation");
                return;
            }

            self = this;
            routes = {};

            if (!self.options['dry-run']) {
                mkdirp.sync(path.join(self.appRoot, 'handlers'));
            }

            Object.keys(this.api.paths).forEach(function (path) {
                var pathnames, route;
                var def = self.api.paths[path];

                route = {
                    path: path,
                    pathname: undefined,
                    methods: [],
                    handler: undefined
                };

                pathnames = [];

                path.split('/').forEach(function (element) {
                    if (element) {
                        pathnames.push(element);
                    }
                });

                route.pathname = pathnames.join('/');
                // if handler specified within specification then use that path
                // else default to the route path.
                route.handler = def['x-handler'] || route.pathname;

                builderUtils.verbs.forEach(function (verb) {
                    var operation = self.api.paths[path][verb];

                    if (!operation) {
                        return;
                    }

                    route.methods.push({
                        method: verb,
                        name: operation.operationId || '',
                        description: operation.description || '',
                        parameters: operation.parameters || [],
                        responses: operation.responses
                    });

                });

                if (routes[route.pathname]) {
                    routes[route.pathname].methods.push.apply(routes[route.pathname].methods, route.methods);
                    return;
                }

                routes[route.pathname] = route;
            });

            Object.keys(routes).forEach(function (routePath) {
                var handlername, route, file;

                route = routes[routePath];
                handlername = route.handler;
                handlername = builderUtils.prefix(handlername, 'handlers/');
                handlername = builderUtils.suffix(handlername, '.js');

                file = path.join(self.appRoot, handlername);

                // existsSync has been deprecated; need to investage using
                // self.fs.exists and corresponding write.
                if (fs.existsSync(file)) {
                    if (!self.options['dry-run']) {
                        fs.writeFileSync(file, update.handlers(file, self.config.get('framework'), route));
                    } else {
                        self.log.ok("(DRY-RUN) handler %s updated", file);
                    }
                    return;
                }

                // provides access to lodash within the template
                route._  = _;
                route.dbmodels = self._getDbModels(route);
                if (!self.options['dry-run']) {
                    self.template('_handler_' + self.config.get('framework') + '.js', file, route);
                } else {
                    self.log.ok("(DRY-RUN) handler %s generated", file);
                }
            });
        },

        tests: function () {
            var self, api, models, resourcePath, handlersPath, modelsPath, apiPath;

            if (!this.config.get('genTests')) {
                debug("skipping api models generation");
                return;
            }

            if (!this.options['dry-run']) {
                mkdirp.sync(path.join(this.appRoot, 'tests'));
            }

            self = this;
            api = this.api;
            models = {};

            apiPath = path.relative(path.join(self.appRoot, 'tests'), self.config.get('apiPath'));
            modelsPath = path.join(self.appRoot, 'models');
            handlersPath = path.relative(path.join(self.appRoot, 'tests'), path.join(self.appRoot, 'handlers'));

            if (api.definitions && modelsPath) {

                Object.keys(api.definitions).forEach(function (key) {
                    var modelSchema, options;

                    options = {};
                    modelSchema = api.definitions[key];

                    Object.keys(modelSchema.properties).forEach(function (prop) {
                        var defaultValue;

                        switch (modelSchema.properties[prop].type) {
                            case 'integer':
                            case 'number':
                            case 'byte':
                                defaultValue = 1;
                                break;
                            case 'string':
                                defaultValue = 'helloworld';
                                break;
                            case 'boolean':
                                defaultValue = true;
                                break;
                            default:
                                break;
                        }

                        if (modelSchema.required && !!~modelSchema.required.indexOf(prop)) {
                            options[prop] = defaultValue;
                        }
                    });

                    models[key] = options;
                });

            }
            resourcePath = api.basePath;

            Object.keys(api.paths).forEach(function (opath) {
                var file, fileName, operations;
                var def = api.paths[opath];

                operations = [];

                builderUtils.verbs.forEach(function (verb) {
                    var operation = {};

                    if (!api.paths[opath][verb]) {
                        return;
                    }

                    Object.keys(def[verb]).forEach(function (key) {
                        operation[key] = def[verb][key];
                    });

                    operation.path = opath;
                    operation.method = verb;

                    operations.push(operation);
                });

                fileName = 'test' + opath.replace(/\//g, '_') + '.js';
                if (def['x-handler']) {
                    fileName = def['x-handler'];
                    fileName = 'test_' + builderUtils.unprefix(fileName, 'handlers/');
                    fileName = builderUtils.suffix(fileName, '.js');
                }
                file = path.join(self.appRoot, 'tests', fileName);

                if (!self.options['dry-run']) {
                    self.template('_test_' + self.config.get('framework') + '.js', file, {
                        _: _,
                        apiPath: apiPath,
                        handlers: handlersPath,
                        resourcePath: resourcePath,
                        operations: operations,
                        models: models,
                        isYaml: isYaml(self.config.get('apiPath'))
                    });
                } else {
                    self.log.ok("(DRY-RUN) test %s generated", file);
                }

            });
        },

        finalize: function () {
            // enable beautify of all js files
            var condition = function (file) {
                return path.extname(file.path) === '.js';
            };

            this.registerTransformStream(gulpif(condition, beautify({jslint_happy: true})));
        }

    },

    install: {
        installNpm: function installNpm() {
            if (this.options['skip-install']) {
                debug("skipping install");
                return;
            }

            if (!this.options.only) {
                if (!this.options['dry-run']) {
                    this.npmInstall([], {"--quiet": true});
                } else {
                    this.log("(DRY-RUN) install complete");
                }
            }
        }
    },

    _prepareDest: function () {
        var apiDestPath = this.destinationPath('config');
        if (this.options['dry-run']) {
            this.log("(DRY-RUN) using temp location %s", path.join(os.tmpdir(), 'config'));
            apiDestPath = path.join(os.tmpdir(), 'config');
        }
        mkdirp.sync(apiDestPath);

        return apiDestPath;
    },

    _isRemote: function (apiPath) {
        return apiPath.indexOf('http') === 0;
    },

    _getDbModels: function getDbModels(route) {
        var self = this;
        var dbModels = [];
        var relPath = path.join(self.appRoot, 'handlers');
        var single, dbFileName, className;

        if (!self.config.get('database')) {
            return null;
        }

        route.path.split('/').forEach(function (element) {
            if (element) {
                single = pluralize.singular(element);
                debug("element: %s single: %s",element, single);
                dbFileName = path.join(self.appRoot, 'models', single + '.js');
                if (self.fs.exists(dbFileName)) {
                    className = us.classify(single);
                    dbModels.push({
                        name: className,
                        path: builderUtils.unsuffix(path.relative(relPath, dbFileName), '.js')
                    });
                }
            }
        });
        debug(dbModels);
        return dbModels;

    }
});

function findFile(name, root, project) {
    var location;
    debug("name: %s root: %s project: %s", name, root, project);

    if (!name) {
        return name;
    }

    location = path.resolve(root, name);
    debug("resolve to root: %s", location);
    if (fs.existsSync(location)) {
        return location;
    }

    location = path.resolve(project, name);
    debug("resolve to project: %s", location);
    if (fs.existsSync(location)) {
        return location;
    }
    debug("using default: %s", name);
    return name;
}

function isYaml(file) {
    if (builderUtils.endsWith(file, '.yaml') || builderUtils.endsWith(file, '.yml')) {
        return true;
    }
    return false;
}

function loadApi(apiPath, content) {
    if (isYaml(apiPath)) {
        debug("loading api using yaml");
        return jsYaml.safeLoad(content);
    }
    debug("loading api using json");
    return JSON.parse(content);
}
