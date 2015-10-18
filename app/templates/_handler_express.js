'use strict';
var _ = require('lodash');
<% _.forEach(dbmodels, function(dbmodel) {%>
var <%=dbmodel.name%> = require('<%=dbmodel.path%>');<%})%>
<%
var getPathType = function(routePath, verb) {
    var parent = false;
    var byId = false;
    var subDoc = false;
    routePath.split('/').forEach(function (element) {
        if (element) {
            if (element === '{parentId}') {
                parent = true;
            } else if (element === '{id}') {
                byId = true;
            } else {
                if (byId) {
                    subDoc = true;
                }
            }
        }
    });

    switch (verb) {
        case 'get':
            if (!byId && !parent) {
                return 'getResources';
            }
            if (byId) {
                if (parent) {
                    return 'getSubResource';
                }
                return subDoc ? 'getSubResources' : 'getResource';
            }
        case 'put':
            if (byId) {
                return parent ? 'putSubResource' : 'putResource';
            }
        case 'delete':
            if (byId) {
                return parent ? 'deleteSubResource' : 'deleteResource';
            }
        case 'post':
            return byId ? 'postSubResource' : 'postResource';
        // case 'patch':
        //     if (byId) {
        //         return parent ? 'patchSubResource' : 'patchResource';
        //     }
        default:
            break;
    }
    return null;
};

var getSubResourceAttribute = function (routePath) {
    var parts = routePath.split('/');
    var subattr = null;

    while (parts) {
        var part = parts.pop();
        if (part && part !== '{parentId}' && part !== '{id}') {
            subattr = part
            break;
        }
    }
    return subattr;
};

var formatSuccessResponse = function(responses, returnKey) {
    var result = 'res.sendStatus(501);';

    if (responses[200]){
        if (responses[200].schema) {
            result = 'res.status(200).send(' + returnKey + ');';
        } else {
            result = 'res.sendStatus(200);';
        }
    } else if (responses[201]) {
        if (responses[201].schema) {
            result = 'res.status(201).send(' + returnKey + ');';
        } else {
            result = 'res.sendStatus(201);';
        }
    } else if (responses[204]) {
        result = 'res.sendStatus(204);';
    }
    return result;
};
%>
/**
 * Operations on <%=path%>
 */
module.exports = {
<% _.forEach(methods, function (method, i) {%>
    /**
     * <%=method.description%>
     * parameters: <%=method.parameters.map(function (p) { return p.name }).join(', ')%>
     */
    <%=method.method%>: function <%=method.name%>(req, res) {
    <% if (!dbmodels) {%>
        res.sendStatus(501);
    <%
        return;
    }
    var Model = dbmodels[0].name;
    var subModelAttribute = getSubResourceAttribute(path);

    switch (getPathType(path, method.method)) {
        case 'getResources':%>
        var query = req.query;
        var filters = {}
        var fields = null;
        var options = {};

        _.forEach(query, function (item, key) {

            switch (key) {
                case 'fields':
                    if (item) {
                        fields = item.replace(',', ' ');
                    }
                    break;

                case 'sort':
                    if (item) {
                        options['sort'] = item.replace(',', ' ');
                    }
                    break;

                case 'offset':
                    if (item && !_.isNaN(_.parseInt(item))) {
                        options['skip'] = _.parseInt(item);
                    }
                    break;

                case 'limit':
                    if (item && !_.isNaN(_.parseInt(item))) {
                        options['limit'] = _.parseInt(item);
                    }
                    break;
                default:
                    filter[key] = item;
            }
        });

        <%=Model%>.find(filters, fields, options, function (err, results) {
            if (err) {
                res.status(500).send({error: err});
            }
            <%=formatSuccessResponse(method.responses, 'results')%>
        });
        <%break;
        case 'getResource':%>
        var fields = !req.query.fields ? null : req.query.fields.replace(',', ' ');
        <%=Model%>.findById(req.params.id, fields, function (err, result) {
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            <%=formatSuccessResponse(method.responses, 'result')%>
        });
        <%break;
        case 'getSubResources':%>
        <%=Model%>.findById(req.params.id, function (err, results) {
            var subDocs;
            if (err) {
                res.status(500).send({error: err});
            }

            if (!results) {
                res.sendStatus(404);
            }
            subDocs = results.<%=subModelAttribute%>;
            if (!subDocs) {
                res.sendStatus(404);
            }
            <%=formatSuccessResponse(method.responses, 'subDocs')%>
        });
        <%break;
        case 'getSubResource':%>
        <%=Model%>.findById(req.params.parentId, function (err, result) {
            var subDoc;
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            subDoc = result.<%=subModelAttribute%>.id(req.params.id);
            if (!subDoc) {
                res.sendStatus(404);
            }
            <%=formatSuccessResponse(method.responses, 'subDoc')%>
        });
        <%break;
        case 'putResource':%>
        <%=Model%>.findByIdAndUpdate(req.params.id, req.body, {'new': true}, function (err, result) {
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            <%=formatSuccessResponse(method.responses, 'result')%>
        });
        <%break;
        case 'putSubResource':%>
        <%=Model%>.findById(req.params.parentId, function (err, result) {
            var subDoc;
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            subDoc = result.<%=subModelAttribute%>.id(req.params.id);
            if (!subDoc) {
                res.sendStatus(404);
            }

            _.each(req.body, function(v, k) {
                subDoc[k] = v;
            });
            result.save(function (err) {
                if (err) {
                    res.status(500).send({error: err});
                }
            });
            <%=formatSuccessResponse(method.responses, 'subDoc')%>
        });
        <%break;
        case 'deleteResource':%>
        <%=Model%>.findByIdAndRemove(req.params.id, function (err, result) {
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            <%=formatSuccessResponse(method.responses, 'result')%>
        });
        <%break;
        case 'deleteSubResource':%>
        <%=Model%>.findById(req.params.parentId, function (err, result) {
            if (err) {
                res.status(500).send({error: err});
            }

            if (!result) {
                res.sendStatus(404);
            }
            result.<%=subModelAttribute%>.id(req.params.id).remove();
            result.save(function (err) {
                if (err) {
                    res.status(500).send({error: err});
                }
            });
            <%=formatSuccessResponse(method.responses, 'result')%>
        });
        <%break;
        case 'postResource':%>
        <%=Model%>.create(req.body, function (err, result) {
            if (err) {
                res.status(500).send({error: err});
            }
            <%=formatSuccessResponse(method.responses, 'result')%>
        });
        <%break;
        case 'postSubResource':%>
        <%=Model%>.findById(req.params.parentId, function (err, result) {
            var subDoc;
            if (err) {
                res.status(500).send({error: err});
            }
            subDoc = result.<%=subModelAttribute%>.addToSet(req.body);
            if (!subDoc) {
                res.sendStatus(400);
            }
            result.save(function (err) {
                if (err) {
                    res.status(500).send({error: err});
                }
            });
            <%=formatSuccessResponse(method.responses, 'subDoc')%>
        });
        <%break;
        default:%>
        res.sendStatus(501);
    <%}%>
    }<%if (i < methods.length - 1) {%>, <%}%>
<%})%>
};
