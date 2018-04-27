/**
 *
 * @param {json} gephiJSON
 * @param {obj} optionsObj
 * @returns {{nodes: Array, edges: Array}}
 */
function parseGephi(gephiJSON, optionsObj) {
  var edges = [];
  var nodes = [];
  var options = {
    edges: {
      inheritColor: false
    },
    nodes: {
      fixed: false,
      parseColor: false
    }
  };

  if (optionsObj !== undefined) {
    if (optionsObj.fixed !== undefined)        {options.nodes.fixed = optionsObj.fixed}
    if (optionsObj.parseColor !== undefined)   {options.nodes.parseColor = optionsObj.parseColor}
    if (optionsObj.inheritColor !== undefined) {options.edges.inheritColor = optionsObj.inheritColor}
  }

  var gEdges = gephiJSON.edges;
  var gNodes = gephiJSON.nodes;
  for (var i = 0; i < gEdges.length; i++) {
    var edge = {};
    var gEdge = gEdges[i];
    edge['id'] = gEdge.id;
    edge['from'] = gEdge.source;
    edge['to'] = gEdge.target;
    edge['attributes'] = gEdge.attributes;
    edge['label'] = gEdge.label;
    edge['title'] = gEdge.attributes !== undefined ? gEdge.attributes.title : undefined;
    if (gEdge['type'] === 'Directed') {
      edge['arrows'] = 'to';
    }
//    edge['value'] = gEdge.attributes !== undefined ? gEdge.attributes.Weight : undefined;
//    edge['width'] = edge['value'] !== undefined ? undefined : edgegEdge.size;
    if (gEdge.color && options.inheritColor === false) {
      edge['color'] = gEdge.color;
    }
    edges.push(edge);
  }

  for (var j = 0; j < gNodes.length; j++) {
    var node = {};
    var gNode = gNodes[j];
    node['id'] = gNode.id;
    node['attributes'] = gNode.attributes;
    node['x'] = gNode.x;
    node['y'] = gNode.y;
    node['label'] = gNode.label;
    node['title'] = gNode.attributes !== undefined ? gNode.attributes.title : gNode.title;
    if (options.nodes.parseColor === true) {
      node['color'] = gNode.color;
    }
    else {
      node['color'] = gNode.color !== undefined ? {background:gNode.color, border:gNode.color, highlight: {background:gNode.color, border:gNode.color}, hover:{background:gNode.color, border:gNode.color}} : undefined;
    }
    node['size'] = gNode.size;
    node['fixed'] = options.nodes.fixed && gNode.x !== undefined && gNode.y !== undefined;
    nodes.push(node);
  }

  return {nodes:nodes, edges:edges};
}

exports.parseGephi = parseGephi;
