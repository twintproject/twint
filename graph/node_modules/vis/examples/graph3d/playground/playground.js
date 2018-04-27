
var query = null;


function load() {
  selectDataType();

  loadCsvExample();
  loadJsonExample();
  loadJavascriptExample();
  loadGooglespreadsheetExample();
  loadDatasourceExample();

  draw();
}



/**
 * Upate the UI based on the currently selected datatype
 */
function selectDataType() {
}


function round(value, decimals) {
  return parseFloat(value.toFixed(decimals));
}

function loadCsvExample() {
  var csv = "";

  // headers
  csv += '"x", "y", "value"\n';

  // create some nice looking data with sin/cos
  var steps = 30;
  var axisMax = 314;
  var axisStep = axisMax / steps;
  for (var x = 0; x < axisMax; x+=axisStep) {
    for (var y = 0; y < axisMax; y+=axisStep) {
      var value = Math.sin(x/50) * Math.cos(y/50) * 50 + 50;

      csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(value, 2) + '\n';
    }
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "surface";
  document.getElementById("verticalRatio").value = "0.5";

  document.getElementById("xLabel").value = "x";
  document.getElementById("yLabel").value = "y";
  document.getElementById("zLabel").value = "value";
  document.getElementById("filterLabel").value = "";
  document.getElementById("legendLabel").value = "";
  drawCsv();
}


function loadCsvAnimationExample() {
  var csv = "";

  // headers
  csv += '"x", "y", "value", "time"\n';

  // create some nice looking data with sin/cos
  var steps = 20;
  var axisMax = 314;
  var tMax = 31;
  var axisStep = axisMax / steps;
  for (var t = 0; t < tMax; t++) {
    for (var x = 0; x < axisMax; x+=axisStep) {
      for (var y = 0; y < axisMax; y+=axisStep) {
        var value = Math.sin(x/50 + t/10) * Math.cos(y/50 + t/10) * 50 + 50;
        csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(value, 2) + ', ' + t + '\n';
      }
    }
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "surface";
  document.getElementById("verticalRatio").value = "0.5";
  document.getElementById("animationInterval").value = 100;

  document.getElementById("xLabel").value = "x";
  document.getElementById("yLabel").value = "y";
  document.getElementById("zLabel").value = "value";
  document.getElementById("filterLabel").value = "time";
  document.getElementById("legendLabel").value = "";

  drawCsv();
}


function loadCsvLineExample() {
  var csv = "";

  // headers
  csv += '"sin(t)", "cos(t)", "t"\n';

  // create some nice looking data with sin/cos
  var steps = 100;
  var axisMax = 314;
  var tmax = 4 * 2 * Math.PI;
  var axisStep = axisMax / steps;
  for (t = 0; t < tmax; t += tmax / steps) {
    var r = 1;
    var x = r * Math.sin(t);
    var y = r * Math.cos(t);
    var z = t;
    csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + '\n';
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "line";
  document.getElementById("verticalRatio").value = "1.0";
  document.getElementById("showPerspective").checked = false;

  document.getElementById("xLabel").value = "sin(t)";
  document.getElementById("yLabel").value = "cos(t)";
  document.getElementById("zLabel").value = "t";
  document.getElementById("filterLabel").value = "";
  document.getElementById("legendLabel").value = "";

  drawCsv();
}

function loadCsvMovingDotsExample() {
  var csv = "";

  // headers
  csv += '"x", "y", "z", "color value", "time"\n';

  // create some shortcuts to math functions
  var sin = Math.sin;
  var cos = Math.cos;
  var pi = Math.PI;

  // create the animation data
  var tmax = 2.0 * pi;
  var tstep = tmax / 75;
  var dotCount = 1;  // set this to 1, 2, 3, 4, ...
  for (var t = 0; t < tmax; t += tstep) {
    var tgroup = parseFloat(t.toFixed(2));
    var value = t;

    // a dot in the center
    var x = 0;
    var y = 0;
    var z = 0;
    csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

    // one or multiple dots moving around the center
    for (var dot = 0; dot < dotCount; dot++) {
      var tdot = t + 2*pi * dot / dotCount;
      //data.addRow([sin(tdot),  cos(tdot), sin(tdot), value, tgroup]);
      //data.addRow([sin(tdot), -cos(tdot), sin(tdot + tmax*1/2), value, tgroup]);

      var x = sin(tdot);
      var y = cos(tdot);
      var z = sin(tdot);
      csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

      var x = sin(tdot);
      var y = -cos(tdot);
      var z = sin(tdot + tmax*1/2);
      csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2) + ', ' + round(value, 2)+ ', ' + round(tgroup, 2) + '\n';

    }
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "dot-color";
  document.getElementById("verticalRatio").value = "1.0";
  document.getElementById("animationInterval").value = "35";
  document.getElementById("animationAutoStart").checked = true;
  document.getElementById("showPerspective").checked = true;

  document.getElementById("xLabel").value = "x";
  document.getElementById("yLabel").value = "y";
  document.getElementById("zLabel").value = "z";
  document.getElementById("filterLabel").value = "time";
  document.getElementById("legendLabel").value = "color value";

  drawCsv();
}

function loadCsvColoredDotsExample() {
  var csv = "";

  // headers
  csv += '"x", "y", "z", "distance"\n';

  // create some shortcuts to math functions
  var sqrt = Math.sqrt;
  var pow = Math.pow;
  var random = Math.random;

  // create the animation data
  var imax = 200;
  for (var i = 0; i < imax; i++) {
    var x = pow(random(), 2);
    var y = pow(random(), 2);
    var z = pow(random(), 2);
    var dist = sqrt(pow(x, 2) + pow(y, 2) + pow(z, 2));

    csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2)  + ', ' + round(dist, 2)+ '\n';
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "dot-color";
  document.getElementById("verticalRatio").value = "1.0";
  document.getElementById("showPerspective").checked = true;

  document.getElementById("xLabel").value = "x";
  document.getElementById("yLabel").value = "y";
  document.getElementById("zLabel").value = "value";
  document.getElementById("legendLabel").value = "distance"
  document.getElementById("filterLabel").value = "";

  drawCsv();
}

function loadCsvSizedDotsExample() {
  var csv = "";

  // headers
  csv += '"x", "y", "z", "range"\n';

  // create some shortcuts to math functions
  var sqrt = Math.sqrt;
  var pow = Math.pow;
  var random = Math.random;

  // create the animation data
  var imax = 200;
  for (var i = 0; i < imax; i++) {
    var x = pow(random(), 2);
    var y = pow(random(), 2);
    var z = pow(random(), 2);
    var dist = sqrt(pow(x, 2) + pow(y, 2) + pow(z, 2));
    var range = sqrt(2) - dist;

    csv += round(x, 2) + ', ' + round(y, 2) + ', ' + round(z, 2)  + ', ' + round(range, 2)+ '\n';
  }

  document.getElementById("csvTextarea").innerHTML = csv;

  // also adjust some settings
  document.getElementById("style").value = "dot-size";
  document.getElementById("verticalRatio").value = "1.0";
  document.getElementById("showPerspective").checked = true;

  document.getElementById("xLabel").value = "x";
  document.getElementById("yLabel").value = "y";
  document.getElementById("zLabel").value = "z";
  document.getElementById("legendLabel").value = "range";
  document.getElementById("filterLabel").value = "";

  drawCsv();
}


function loadJsonExample() {
}


function loadJavascriptExample() {
}

function loadJavascriptFunctionExample() {
}

function loadGooglespreadsheetExample() {

}


function loadDatasourceExample() {
}



/**
 * Retrieve teh currently selected datatype
 * @return {string} datatype
 */
function getDataType() {
  return "csv";
}


/**
 * Retrieve the datatable from the entered contents of the csv text
 * @param {boolean} [skipValue] | if true, the 4th element is a filter value
 * @return {vis.DataSet}
 */
function getDataCsv() {
  var csv = document.getElementById("csvTextarea").value;

  // parse the csv content
  var csvArray = csv2array(csv);

  var data = new vis.DataSet();

  var skipValue = false;
  if (document.getElementById("filterLabel").value != "" && document.getElementById("legendLabel").value == "") {
    skipValue = true;
  }

  // read all data
  for (var row = 1; row < csvArray.length; row++) {
    if (csvArray[row].length == 4 && skipValue == false) {
      data.add({x:parseFloat(csvArray[row][0]),
        y:parseFloat(csvArray[row][1]),
        z:parseFloat(csvArray[row][2]),
        style:parseFloat(csvArray[row][3])});
    }
    else if (csvArray[row].length == 4 && skipValue == true) {
      data.add({x:parseFloat(csvArray[row][0]),
        y:parseFloat(csvArray[row][1]),
        z:parseFloat(csvArray[row][2]),
        filter:parseFloat(csvArray[row][3])});
    }
    else if (csvArray[row].length == 5) {
      data.add({x:parseFloat(csvArray[row][0]),
        y:parseFloat(csvArray[row][1]),
        z:parseFloat(csvArray[row][2]),
        style:parseFloat(csvArray[row][3]),
        filter:parseFloat(csvArray[row][4])});
    }
    else {
      data.add({x:parseFloat(csvArray[row][0]),
        y:parseFloat(csvArray[row][1]),
        z:parseFloat(csvArray[row][2]),
        style:parseFloat(csvArray[row][2])});
    }
  }

  return data;
}

/**
 * remove leading and trailing spaces
 */
function trim(text) {
  while (text.length && text.charAt(0) == ' ')
    text = text.substr(1);

  while (text.length && text.charAt(text.length-1) == ' ')
    text = text.substr(0, text.length-1);

  return text;
}

/**
 * Retrieve the datatable from the entered contents of the javascript text
 * @return {vis.DataSet}
 */
function getDataJson() {
  var json = document.getElementById("jsonTextarea").value;
  var data = new google.visualization.DataTable(json);

  return data;
}


/**
 * Retrieve the datatable from the entered contents of the javascript text
 * @return {vis.DataSet}
 */
function getDataJavascript() {
  var js = document.getElementById("javascriptTextarea").value;

  eval(js);

  return data;
}


/**
 * Retrieve the datatable from the entered contents of the datasource text
 * @return {vis.DataSet}
 */
function getDataDatasource() {
}

/**
 * Retrieve a JSON object with all options
 */
function getOptions() {
  var options = {
    width:              document.getElementById("width").value,
    height:             document.getElementById("height").value,
    style:              document.getElementById("style").value,
    showAnimationControls: (document.getElementById("showAnimationControls").checked != false),
    showGrid:          (document.getElementById("showGrid").checked != false),
    showXAxis:         (document.getElementById("showXAxis").checked != false),
    showYAxis:         (document.getElementById("showYAxis").checked != false),
    showZAxis:         (document.getElementById("showZAxis").checked != false),
    showPerspective:   (document.getElementById("showPerspective").checked != false),
    showLegend:        (document.getElementById("showLegend").checked != false),
    showShadow:        (document.getElementById("showShadow").checked != false),
    keepAspectRatio:   (document.getElementById("keepAspectRatio").checked != false),
    verticalRatio:      Number(document.getElementById("verticalRatio").value) || undefined,
    animationInterval:  Number(document.getElementById("animationInterval").value) || undefined,
    xLabel:             document.getElementById("xLabel").value,
    yLabel:             document.getElementById("yLabel").value,
    zLabel:             document.getElementById("zLabel").value,
    filterLabel:        document.getElementById("filterLabel").value,
    legendLabel:        document.getElementById("legendLabel").value,
    animationPreload:  (document.getElementById("animationPreload").checked != false),
    animationAutoStart:(document.getElementById("animationAutoStart").checked != false),

    xCenter:           document.getElementById("xCenter").value,
    yCenter:           document.getElementById("yCenter").value,

    xMin:              Number(document.getElementById("xMin").value) || undefined,
    xMax:              Number(document.getElementById("xMax").value) || undefined,
    xStep:             Number(document.getElementById("xStep").value) || undefined,
    yMin:              Number(document.getElementById("yMin").value) || undefined,
    yMax:              Number(document.getElementById("yMax").value) || undefined,
    yStep:             Number(document.getElementById("yStep").value) || undefined,
    zMin:              Number(document.getElementById("zMin").value) || undefined,
    zMax:              Number(document.getElementById("zMax").value) || undefined,
    zStep:             Number(document.getElementById("zStep").value) || undefined,

    valueMin:          Number(document.getElementById("valueMin").value) || undefined,
    valueMax:          Number(document.getElementById("valueMax").value) || undefined,

    xBarWidth:         Number(document.getElementById("xBarWidth").value) || undefined,
    yBarWidth:         Number(document.getElementById("yBarWidth").value) || undefined
  };

  return options;
}

/**
 * Redraw the graph with the entered data and options
 */
function draw() {
  return drawCsv();
}


function drawCsv() {
  // retrieve data and options
  var data = getDataCsv();
  var options = getOptions();

  // Creat a graph
  var graph = new vis.Graph3d(document.getElementById('graph'), data, options);
}

function drawJson() {
  // retrieve data and options
  var data = getDataJson();
  var options = getOptions();

  // Creat a graph
  var graph = new vis.Graph3d(document.getElementById('graph'), data, options);
}

function drawJavascript() {
  // retrieve data and options
  var data = getDataJavascript();
  var options = getOptions();

  // Creat a graph
  var graph = new vis.Graph3d(document.getElementById('graph'), data, options);
}


function drawGooglespreadsheet() {
  // Instantiate our graph object.
  drawGraph = function(response) {
    document.getElementById("draw").disabled = "";

    if (response.isError()) {
      error = 'Error: ' + response.getMessage();
      document.getElementById('graph').innerHTML =
          "<span style='color: red; font-weight: bold;'>" + error + "</span>"; ;
    }

    // retrieve the data from the query response
    data = response.getDataTable();

    // specify options
    options = getOptions();

    // Instantiate our graph object.
    var graph = new vis.Graph3d(document.getElementById('graph'), data, options);
  }

  url = document.getElementById("googlespreadsheetText").value;
  document.getElementById("draw").disabled = "disabled";

  // send the request
  query && query.abort();
  query = new google.visualization.Query(url);
  query.send(drawGraph);
}


function drawDatasource() {
  // Instantiate our graph object.
  drawGraph = function(response) {
    document.getElementById("draw").disabled = "";

    if (response.isError()) {
      error = 'Error: ' + response.getMessage();
      document.getElementById('graph').innerHTML =
          "<span style='color: red; font-weight: bold;'>" + error + "</span>"; ;
    }

    // retrieve the data from the query response
    data = response.getDataTable();

    // specify options
    options = getOptions();

    // Instantiate our graph object.
    var graph = new vis.Graph3d(document.getElementById('graph'), data, options);
  };

  url = document.getElementById("datasourceText").value;
  document.getElementById("draw").disabled = "disabled";

  // if the entered url is a google spreadsheet url, replace the part
  // "/ccc?" with "/tq?" in order to retrieve a neat data query result
  if (url.indexOf("/ccc?")) {
    url.replace("/ccc?", "/tq?");
  }

  // send the request
  query && query.abort();
  query = new google.visualization.Query(url);
  query.send(drawGraph);
}
