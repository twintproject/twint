/**
 * Created by Alex on 4/21/2015.
 */

/**
 * it works like this:
 *
 *   the toggle row has the onclick with the table id, the parent name and this. The function will look through all trs with matching parent and check the class
 *   if hidden, it shows them, else it hides them.
 *
 *   The caret is also flipped and the toggle class is changed.
 *
 *
 <tr class='toggle collapsible' onclick="toggleTable('physicsTable','barnesHut', this);"><td><span parent="barnesHut" class="right-caret"></span> barnesHut</td></tr>
 <tr parent="barnesHut" class="hidden"><td>barnesHut.gravitationalConstant</td></tr>
 <tr parent="barnesHut" class="hidden"><td>barnesHut.centralGravity</td></tr>
 <tr parent="barnesHut" class="hidden"><td>barnesHut.springLength</td></tr>
 <tr parent="barnesHut" class="hidden"><td>barnesHut.springConstant</td></tr>
 <tr parent="barnesHut" class="hidden"><td>barnesHut.damping</td></tr>
 *
 *
 * @param tableId
 * @param parent
 * @param clickedRow
 */
function toggleTable(tableId, parent, clickedRow) {
  var table = document.getElementById(tableId);
  var wasOpen = false;
  for (var i = 0, row; row = table.rows[i]; i++) {
    if (row.getAttribute('parent') === parent) {
      if (row.className.indexOf('hidden') !== -1) {
        row.className = row.className.replace(' hidden','').replace('hidden','');
        row.className += ' visible';
      }
      else {
        row.className = row.className.replace(' visible','').replace('visible','');;
        row.className += ' hidden';
        wasOpen = true;
      }
    }
  }

  var spans;
  if (wasOpen === true) {
    spans = document.getElementsByClassName('caret');
    clickedRow.className += ' collapsible';
  }
  else {
    spans = document.getElementsByClassName('right-caret')
    clickedRow.className = clickedRow.className.replace(' collapsible','').replace('collapsible','');;
  }

  for (var i = 0; i < spans.length; i++) {
    if (spans[i].getAttribute('parent') === parent) {
      spans[i].className = wasOpen === true ? 'right-caret' : 'caret';
    }
  }
}

function toggleTab(tabThis) {
  var parentNode = tabThis.parentNode;
  var active = tabThis.className.indexOf('active') !== -1;
  for (var i = 0; i < parentNode.children.length; i++) {
    var child = parentNode.children[i];
    var targetNodeId = child.getAttribute('targetNode');
    if (targetNodeId) {
      var targetNode = document.getElementById(child.getAttribute('targetNode'));
      targetNode.className = targetNode.className.replace(' hidden', '').replace('hidden', '') + ' hidden';
    }
    child.className = child.className.replace(' active','').replace('active','');
  }

  // activate the tab
  tabThis.className += ' active';
  var ownTargetNodeId = tabThis.getAttribute('targetNode');
  if (ownTargetNodeId) {
    var ownTargetNode = document.getElementById(ownTargetNodeId);
    ownTargetNode.className = ownTargetNode.className.replace(' hidden','').replace('hidden','');
  }

}