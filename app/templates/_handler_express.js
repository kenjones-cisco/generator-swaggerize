'use strict';
<% _.forEach(dbmodels, function(dbmodel) {%>
var <%=dbmodel.name%> = require('<%=dbmodel.path%>');<%})%>
<%
var refRegExp = /^#\/definitions\/(\w*)$/;

var isSchemaHasRef = function(schema) {
    return schema['$ref'] || ((schema['type'] === 'array') && (schema['items']['$ref']));
};

var formatSchema = function(schema) {
    var output = {};
    if (isSchemaHasRef(schema)) {
        if (schema['$ref']) {
            output = schema['$ref'].match(refRegExp)[1];
        } else {
            output = [schema['items']['$ref'].match(refRegExp)[1]];
        }
    }
    return JSON.stringify(output).replace(/"/g,"");
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
        res.sendStatus(501);
        <% _.forEach(method.responses, function (response, key) {%>
        // <%=key%>: <%=response.description%><% if (response.schema) {%>
        // res.status(<%=key%>).json(<%=formatSchema(response.schema)%>);<%} else {%>
        // res.sendStatus(<%=key%>);<%}%>
        <%})%>
    }<%if (i < methods.length - 1) {%>, <%}%>
    <%})%>
};
