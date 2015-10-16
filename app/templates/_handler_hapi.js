'use strict';

/**
 * Operations on <%=path%>
 */
module.exports = {
    <% _.forEach(methods, function (method, i) {%>
    /**
     * <%=method.description%>
     * parameters: <%=method.parameters.map(function (p) { return p.name }).join(', ')%>
     */
    <%=method.method%>: function <%=method.name%>(req, reply) {
        reply().code(501);
    }<%if (i < methods.length - 1) {%>, <%}%>
    <%})%>
};
