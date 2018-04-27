var DOMutil = require('../../../DOMutil');

/**
 *
 * @param {vis.GraphGroup.id} groupId
 * @param {Object} options   // TODO: Describe options
 * @constructor Line
 */
function Line(groupId, options) {  // eslint-disable-line no-unused-vars
}

Line.calcPath = function (dataset, group) {
    if (dataset != null) {
        if (dataset.length > 0) {
            var d = [];

            // construct path from dataset
            if (group.options.interpolation.enabled == true) {
                d = Line._catmullRom(dataset, group);
            }
            else {
                d = Line._linear(dataset);
            }
            return d;
        }
    }
};

Line.drawIcon = function (group, x, y, iconWidth, iconHeight, framework) {
    var fillHeight = iconHeight * 0.5;
    var path, fillPath;

    var outline = DOMutil.getSVGElement("rect", framework.svgElements, framework.svg);
    outline.setAttributeNS(null, "x", x);
    outline.setAttributeNS(null, "y", y - fillHeight);
    outline.setAttributeNS(null, "width", iconWidth);
    outline.setAttributeNS(null, "height", 2 * fillHeight);
    outline.setAttributeNS(null, "class", "vis-outline");

    path = DOMutil.getSVGElement("path", framework.svgElements, framework.svg);
    path.setAttributeNS(null, "class", group.className);
    if (group.style !== undefined) {
        path.setAttributeNS(null, "style", group.style);
    }

    path.setAttributeNS(null, "d", "M" + x + "," + y + " L" + (x + iconWidth) + "," + y + "");
    if (group.options.shaded.enabled == true) {
        fillPath = DOMutil.getSVGElement("path", framework.svgElements, framework.svg);
        if (group.options.shaded.orientation == 'top') {
            fillPath.setAttributeNS(null, "d", "M" + x + ", " + (y - fillHeight) +
              "L" + x + "," + y + " L" + (x + iconWidth) + "," + y + " L" + (x + iconWidth) + "," + (y - fillHeight));
        }
        else {
            fillPath.setAttributeNS(null, "d", "M" + x + "," + y + " " +
              "L" + x + "," + (y + fillHeight) + " " +
              "L" + (x + iconWidth) + "," + (y + fillHeight) +
              "L" + (x + iconWidth) + "," + y);
        }
        fillPath.setAttributeNS(null, "class", group.className + " vis-icon-fill");
        if (group.options.shaded.style !== undefined && group.options.shaded.style !== "") {
            fillPath.setAttributeNS(null, "style", group.options.shaded.style);
        }
    }

    if (group.options.drawPoints.enabled == true) {
        var groupTemplate = {
            style: group.options.drawPoints.style,
            styles: group.options.drawPoints.styles,
            size: group.options.drawPoints.size,
            className: group.className
        };
        DOMutil.drawPoint(x + 0.5 * iconWidth, y, groupTemplate, framework.svgElements, framework.svg);
    }
};

Line.drawShading = function (pathArray, group, subPathArray, framework) {
    // append shading to the path
    if (group.options.shaded.enabled == true) {
        var svgHeight = Number(framework.svg.style.height.replace('px',''));
        var fillPath = DOMutil.getSVGElement('path', framework.svgElements, framework.svg);
        var type = "L";
        if (group.options.interpolation.enabled == true){
            type = "C";
        }
        var dFill;
        var zero = 0;
        if (group.options.shaded.orientation == 'top') {
            zero = 0;
        }
        else if (group.options.shaded.orientation == 'bottom') {
            zero = svgHeight;
        }
        else {
            zero = Math.min(Math.max(0, group.zeroPosition), svgHeight);
        }
        if (group.options.shaded.orientation == 'group' && (subPathArray != null && subPathArray != undefined)) {
            dFill = 'M' + pathArray[0][0]+ ","+pathArray[0][1] + " " +
                    this.serializePath(pathArray,type,false) +
                    ' L'+ subPathArray[subPathArray.length-1][0]+ "," + subPathArray[subPathArray.length-1][1] + " " +
                    this.serializePath(subPathArray,type,true) +
                    subPathArray[0][0]+ ","+subPathArray[0][1] + " Z";
        }
        else {
            dFill = 'M' + pathArray[0][0]+ ","+pathArray[0][1] + " " +
                    this.serializePath(pathArray,type,false) +
                    ' V' + zero + ' H'+ pathArray[0][0] + " Z";
        }

        fillPath.setAttributeNS(null, 'class', group.className + ' vis-fill');
        if (group.options.shaded.style !== undefined) {
            fillPath.setAttributeNS(null, 'style', group.options.shaded.style);
        }
        fillPath.setAttributeNS(null, 'd', dFill);
    }
};

/**
 * draw a line graph
 *
 * @param {Array.<Object>} pathArray
 * @param {vis.Group} group
 * @param {{svg: Object, svgElements: Array.<Object>, options: Object, groups: Array.<vis.Group>}} framework
 */
Line.draw = function (pathArray, group, framework) {
    if (pathArray != null && pathArray != undefined) {
        var path = DOMutil.getSVGElement('path', framework.svgElements, framework.svg);
        path.setAttributeNS(null, "class", group.className);
        if (group.style !== undefined) {
            path.setAttributeNS(null, "style", group.style);
        }

        var type = "L";
        if (group.options.interpolation.enabled == true){
            type = "C";
        }
        // copy properties to path for drawing.
        path.setAttributeNS(null, 'd', 'M' + pathArray[0][0]+ ","+pathArray[0][1] + " " + this.serializePath(pathArray,type,false));
    }
};

Line.serializePath = function(pathArray,type,inverse){
    if (pathArray.length < 2){
        //Too little data to create a path.
        return "";
    }
    var d = type;
    var i;
    if (inverse){
        for (i = pathArray.length-2; i > 0; i--){
            d += pathArray[i][0] + "," + pathArray[i][1] + " ";
        }
    }
    else {
        for (i = 1; i < pathArray.length; i++){
            d += pathArray[i][0] + "," + pathArray[i][1] + " ";
        }
    }
    return d;
};

/**
 * This uses an uniform parametrization of the interpolation algorithm:
 * 'On the Parameterization of Catmull-Rom Curves' by Cem Yuksel et al.
 * @param {Array.<Object>} data
 * @returns {string}
 * @private
 */
Line._catmullRomUniform = function (data) {
    // catmull rom
    var p0, p1, p2, p3, bp1, bp2;
    var d = [];
    d.push( [ Math.round(data[0].screen_x) , Math.round(data[0].screen_y) ]);
    var normalization = 1 / 6;
    var length = data.length;
    for (var i = 0; i < length - 1; i++) {

        p0 = (i == 0) ? data[0] : data[i - 1];
        p1 = data[i];
        p2 = data[i + 1];
        p3 = (i + 2 < length) ? data[i + 2] : p2;


        // Catmull-Rom to Cubic Bezier conversion matrix
        //    0       1       0       0
        //  -1/6      1      1/6      0
        //    0      1/6      1     -1/6
        //    0       0       1       0

        //    bp0 = { x: p1.x,                               y: p1.y };
        bp1 = {
            screen_x: ((-p0.screen_x + 6 * p1.screen_x + p2.screen_x) * normalization),
            screen_y: ((-p0.screen_y + 6 * p1.screen_y + p2.screen_y) * normalization)
        };
        bp2 = {
            screen_x: (( p1.screen_x + 6 * p2.screen_x - p3.screen_x) * normalization),
            screen_y: (( p1.screen_y + 6 * p2.screen_y - p3.screen_y) * normalization)
        };
        //    bp0 = { x: p2.x,                               y: p2.y };

        d.push( [ bp1.screen_x , bp1.screen_y ]);
        d.push( [ bp2.screen_x , bp2.screen_y ]);
        d.push( [ p2.screen_x  , p2.screen_y  ]);
    }

    return d;
};

/**
 * This uses either the chordal or centripetal parameterization of the catmull-rom algorithm.
 * By default, the centripetal parameterization is used because this gives the nicest results.
 * These parameterizations are relatively heavy because the distance between 4 points have to be calculated.
 *
 * One optimization can be used to reuse distances since this is a sliding window approach.
 * @param {Array.<Object>} data
 * @param {vis.GraphGroup} group
 * @returns {string}
 * @private
 */
Line._catmullRom = function (data, group) {
    var alpha = group.options.interpolation.alpha;
    if (alpha == 0 || alpha === undefined) {
        return this._catmullRomUniform(data);
    }
    else {
        var p0, p1, p2, p3, bp1, bp2, d1, d2, d3, A, B, N, M;
        var d3powA, d2powA, d3pow2A, d2pow2A, d1pow2A, d1powA;
        var d = [];
        d.push( [ Math.round(data[0].screen_x) , Math.round(data[0].screen_y) ]);
        var length = data.length;
        for (var i = 0; i < length - 1; i++) {

            p0 = (i == 0) ? data[0] : data[i - 1];
            p1 = data[i];
            p2 = data[i + 1];
            p3 = (i + 2 < length) ? data[i + 2] : p2;

            d1 = Math.sqrt(Math.pow(p0.screen_x - p1.screen_x, 2) + Math.pow(p0.screen_y - p1.screen_y, 2));
            d2 = Math.sqrt(Math.pow(p1.screen_x - p2.screen_x, 2) + Math.pow(p1.screen_y - p2.screen_y, 2));
            d3 = Math.sqrt(Math.pow(p2.screen_x - p3.screen_x, 2) + Math.pow(p2.screen_y - p3.screen_y, 2));

            // Catmull-Rom to Cubic Bezier conversion matrix

            // A = 2d1^2a + 3d1^a * d2^a + d3^2a
            // B = 2d3^2a + 3d3^a * d2^a + d2^2a

            // [   0             1            0          0          ]
            // [   -d2^2a /N     A/N          d1^2a /N   0          ]
            // [   0             d3^2a /M     B/M        -d2^2a /M  ]
            // [   0             0            1          0          ]

            d3powA = Math.pow(d3, alpha);
            d3pow2A = Math.pow(d3, 2 * alpha);
            d2powA = Math.pow(d2, alpha);
            d2pow2A = Math.pow(d2, 2 * alpha);
            d1powA = Math.pow(d1, alpha);
            d1pow2A = Math.pow(d1, 2 * alpha);

            A = 2 * d1pow2A + 3 * d1powA * d2powA + d2pow2A;
            B = 2 * d3pow2A + 3 * d3powA * d2powA + d2pow2A;
            N = 3 * d1powA * (d1powA + d2powA);
            if (N > 0) {
                N = 1 / N;
            }
            M = 3 * d3powA * (d3powA + d2powA);
            if (M > 0) {
                M = 1 / M;
            }

            bp1 = {
                screen_x: ((-d2pow2A * p0.screen_x + A * p1.screen_x + d1pow2A * p2.screen_x) * N),
                screen_y: ((-d2pow2A * p0.screen_y + A * p1.screen_y + d1pow2A * p2.screen_y) * N)
            };

            bp2 = {
                screen_x: (( d3pow2A * p1.screen_x + B * p2.screen_x - d2pow2A * p3.screen_x) * M),
                screen_y: (( d3pow2A * p1.screen_y + B * p2.screen_y - d2pow2A * p3.screen_y) * M)
            };

            if (bp1.screen_x == 0 && bp1.screen_y == 0) {
                bp1 = p1;
            }
            if (bp2.screen_x == 0 && bp2.screen_y == 0) {
                bp2 = p2;
            }
            d.push( [ bp1.screen_x , bp1.screen_y ]);
            d.push( [ bp2.screen_x , bp2.screen_y ]);
            d.push( [ p2.screen_x  , p2.screen_y  ]);
        }

        return d;
    }
};

/**
 * this generates the SVG path for a linear drawing between datapoints.
 * @param {Array.<Object>} data
 * @returns {string}
 * @private
 */
Line._linear = function (data) {
    // linear
    var d = [];
    for (var i = 0; i < data.length; i++) {
        d.push([ data[i].screen_x , data[i].screen_y ]);
    }
    return d;
};

module.exports = Line;
