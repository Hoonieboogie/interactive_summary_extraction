var sg;
(function (sg) {
    sg.version = "2.2.5";
    window["sg"] = sg;
})(sg || (sg = {}));
var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
if (isChrome) {
    console.info("%csg.js", "background:#f05534; color:#414141; font-size:150%; padding-left:250px; padding-right:250px", sg.version);
}
else {
    console.info("sg.js", sg.version);
}
(function (sg) {
    var dom;
    (function (dom) {
        var VENDORS = ['Webkit', 'Moz', 'O', 'ms'];
        function prefix(property, el) {
            var propertyUC = property.slice(0, 1).toUpperCase() + property.slice(1);
            for (var i = 0, len = VENDORS.length; i < len; i++) {
                var vendor = VENDORS[i];
                if (typeof (el || document.body).style[vendor + propertyUC] !== 'undefined') {
                    return vendor + propertyUC;
                }
            }
            return property;
        }
        dom.prefix = prefix;
        function transformCSS(x, y, rotation) {
            return 'translate(' + x + 'px,' + y + 'px) rotate(' + rotation + 'deg)';
        }
        dom.transformCSS = transformCSS;
        var expAllowCreateTag = /\<([a-z]([a-z0-9-]+)?)\>/i;
        function $(selector, attr, doc) {
            if (!selector) {
                console.error("selector is", selector);
                return null;
            }
            doc = doc || document;
            var m = selector.match(expAllowCreateTag);
            if (m) {
                var tag = doc.createElement(m[1]);
                if (typeof attr === "object") {
                    for (var o in attr) {
                        if (o == "text") {
                            tag.innerHTML = attr[o];
                        }
                        else {
                            if (typeof attr[o] === "undefined" || attr[0] === null) {
                                tag.removeAttribute(o);
                            }
                            else {
                                tag.setAttribute(o, attr[o]);
                            }
                        }
                    }
                }
                return tag;
            }
            else {
                if (selector.charAt(0) == "#")
                    return doc.querySelector(selector);
                return doc.querySelectorAll(selector);
            }
        }
        dom.$ = $;
        function getJsObj(path, parent) {
            window["scriptList"] = window["scriptList"] || {};
            return window["scriptList"][path] || (window["scriptList"][path] = {
                tag: document.createElement("script"),
                path: path,
                state: "init",
                callbacks: [],
                init: function () {
                    console.info("INIT", this.path);
                    var scs = document.querySelectorAll("script");
                    for (var i in scs) {
                        if (scs[i].src && scs[i].src.indexOf(this.path) > -1) {
                            this.runCallbacks();
                            return;
                        }
                    }
                    var self = this;
                    this.tag.setAttribute("type", "text/javascript");
                    this.tag.onload = function () {
                        self.state = "complete";
                        self.runCallbacks();
                    };
                    this.state = "loading";
                    if (parent) {
                        parent.appendChild(this.tag);
                    }
                    else {
                        document.head.appendChild(this.tag);
                    }
                    this.tag.src = this.path;
                },
                addCallback: function (f) {
                    this.callbacks.push(f);
                },
                runCallbacks: function () {
                    this.callbacks.map(function (v, i, arr) {
                        if (v)
                            v.call();
                    });
                }
            });
        }
        function addCss(filename, className) {
            var link;
            if (typeof filename === "string")
                filename = [filename];
            for (var i = 0; i < filename.length; i++) {
                var cssList = document.querySelectorAll('link[href="' + filename[i] + '"]');
                for (var j = 0; j < cssList.length; j++) {
                    document.head.removeChild(cssList[j]);
                }
                link = document.createElement("link");
                link.href = filename[i];
                link.rel = "stylesheet";
                link.type = "text/css";
                if (className) {
                    link.className = className;
                }
                document.head.appendChild(link);
            }
        }
        dom.addCss = addCss;
        function addStyle(style) {
            var tag = document.createElement("style");
            tag.innerHTML = style;
            document.head.appendChild(tag);
        }
        dom.addStyle = addStyle;
        var jqueryUrl = "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js";
        function setJQueryUrl(url) {
            jqueryUrl = url;
        }
        dom.setJQueryUrl = setJQueryUrl;
        function getJQueryUrl() {
            return jqueryUrl;
        }
        dom.getJQueryUrl = getJQueryUrl;
        function addJQuery(callback, override) {
            if (override === void 0) { override = false; }
            if (!window["jQuery"] || override) {
                addJs(getJQueryUrl(), function () {
                    jQuery.noConflict();
                    if (callback)
                        callback.call(window, jQuery);
                });
            }
            else {
                if (callback)
                    callback.call(window, jQuery);
            }
        }
        dom.addJQuery = addJQuery;
        function addJQueryPlugin(filename, callback, override) {
            if (override === void 0) { override = false; }
            addJQuery(function ($) {
                addJs(filename, function () {
                    if (callback)
                        callback.call(window, $);
                });
            }, override);
        }
        dom.addJQueryPlugin = addJQueryPlugin;
        function addJs(filename, callback, parent) {
            var o, self = this;
            if (typeof filename === "string") {
                o = getJsObj(filename, parent);
                o.addCallback(callback);
            }
            else if (filename && filename.length > 0) {
                o = getJsObj(filename.shift(), parent);
                if (filename.length == 0) {
                    o.addCallback(callback);
                }
                else {
                    o.addCallback(function () {
                        self.addJs(filename, callback);
                    });
                }
            }
            if (o) {
                switch (o.state) {
                    case "init":
                        o.init();
                        break;
                    case "complete":
                        o.runCallbacks();
                        break;
                }
            }
        }
        dom.addJs = addJs;
        function getMatrix(element) {
            return element.style.transform.replace(/[^0-9\-.,]/g, '').split(',');
        }
        dom.getMatrix = getMatrix;
        function getScale(element) {
            var tr = element.style.transform;
            var m, n;
            m = tr.match(/scale\(([-.0-9]+),?\s?([-.0-9]+)?\)/);
            if (m) {
                return {
                    x: parseFloat(m[1]),
                    y: parseFloat(m[2] || m[1])
                };
            }
            else {
                m = tr.match(/scaleX\(([-.0-9]+)\)/);
                n = tr.match(/scaleY\(([-.0-9]+)\)/);
                return {
                    x: m ? parseFloat(m[1]) : 1,
                    y: n ? parseFloat(n[1]) : 1
                };
            }
        }
        dom.getScale = getScale;
        function setScale(element, scale) {
            var tr = element.style.transform.split(' ');
            var sc = getScale(element);
            sg.utils.unionMerge(sc, scale);
            var a = [];
            tr.map(function (v, i, a) {
                if (v.indexOf("scale") == -1) {
                    a.push(v);
                }
            });
            a.push("scale(" + sc.x + "," + sc.y + ")");
            element.style.transform = a.join(' ');
        }
        dom.setScale = setScale;
        function getTranslate(element) {
            return element.style.transform.replace("translate3d", "").replace(/[^0-9\-.,]/g, '').split(',');
        }
        dom.getTranslate = getTranslate;
        function getLeft(element) {
            return parseFloat(element.style.left) || element.offsetLeft;
        }
        dom.getLeft = getLeft;
        function getGLeft(element) {
            var left = 0;
            while (element.tagName !== "BODY") {
                left += this.getLeft(element);
                element = element.parentNode;
            }
            return left;
        }
        dom.getGLeft = getGLeft;
        function getTop(element) {
            return parseFloat(element.style.top) || element.offsetTop;
        }
        dom.getTop = getTop;
        function getGTop(element) {
            var top = 0;
            while (element.tagName !== "BODY") {
                top += this.getTop(element);
                element = element.parentNode;
            }
            return top;
        }
        dom.getGTop = getGTop;
        function getPosition(element) {
            return { left: this.getLeft(element), top: this.getTop(element) };
        }
        dom.getPosition = getPosition;
        function getGPosition(element) {
            var o = { left: 0, top: 0 };
            while (element.tagName !== "BODY") {
                o.left += this.getLeft(element);
                o.top += this.getTop(element);
                element = element.parentNode;
            }
            return o;
        }
        dom.getGPosition = getGPosition;
        function getX(element) {
            var matrix = getTranslate(element);
            return parseFloat(element.style.left) + parseFloat(matrix[0] || "0");
        }
        dom.getX = getX;
        function getY(element) {
            var matrix = getTranslate(element);
            return parseFloat(element.style.top) + parseFloat(matrix[1] || "0");
        }
        dom.getY = getY;
        function getXY(element) {
            var matrix = getTranslate(element);
            return { x: parseFloat(element.style.left) + parseFloat(matrix[0] || "0"), y: parseFloat(element.style.top) + parseFloat(matrix[1] || "0") };
        }
        dom.getXY = getXY;
        function _getOptionValue(elementOrSelector, target) {
            if (target === void 0) { target = "value"; }
            var e;
            if (typeof elementOrSelector === "string") {
                e = $(elementOrSelector);
            }
            else {
                e = elementOrSelector;
            }
            if (!e)
                return null;
            if (e.hasOwnProperty("length")) {
                e = e[0];
            }
            if (e.tagName.toLowerCase() == "select") {
                if (e.selectedIndex == -1)
                    return null;
                return e.options[e.selectedIndex][target == "value" ? target : "text"];
            }
            else {
                return null;
            }
        }
        function getOptionValue(elementOrSelector) {
            return _getOptionValue(elementOrSelector, "value");
        }
        dom.getOptionValue = getOptionValue;
        function getOptionText(elementOrSelector) {
            return _getOptionValue(elementOrSelector, "text");
        }
        dom.getOptionText = getOptionText;
        var _selectStyle = "margin:0px;box-sizing:border-box;boder:solid 1px #c5c5c5;border-radius:2px;color:#666666;";
        function createSelect(options, attrs, blankStr) {
            var o, attrs = attrs || {};
            attrs.style = _selectStyle + (attrs.style ? attrs.style : "");
            var s = this.$("<select>", attrs);
            if (typeof blankStr === "string") {
                s.appendChild(this.$("<option>", { value: "", text: blankStr }));
            }
            else if (blankStr && typeof blankStr === "object") {
                s.appendChild(this.$("<option>", { value: blankStr.value, text: blankStr.title }));
            }
            for (o in options) {
                if (typeof options[o] === "string") {
                    s.appendChild(this.$("<option>", { value: options[o], text: options[o] }));
                }
                else {
                    s.appendChild(this.$("<option>", { value: options[o]["value"], text: options[o]["title"], selected: options[o]["selected"] }));
                }
            }
            return s;
        }
        dom.createSelect = createSelect;
        function updateSelect(target, options, blankStr, dispatchOnChange) {
            var o, s;
            if (typeof target === "string") {
                s = this.$(target);
            }
            else {
                s = target;
            }
            var oldValue = getOptionValue(s) || false;
            s.innerHTML = "";
            if (typeof blankStr === "string") {
                s.appendChild(this.$("<option>", { value: "", text: blankStr }));
            }
            else if (blankStr && typeof blankStr === "object") {
                s.appendChild(this.$("<option>", { value: blankStr.value, text: blankStr.title }));
            }
            var tmp;
            var isNewSelected = false;
            for (o in options) {
                if (typeof options[o] === "object" && options[o]["selected"]) {
                    isNewSelected = true;
                }
            }
            for (o in options) {
                if (!isNewSelected) {
                    if (typeof options[o] === "string") {
                        tmp = { value: options[o], text: options[o] };
                    }
                    else {
                        tmp = { value: options[o]["value"], text: options[o]["title"] };
                    }
                    if (tmp.value == oldValue) {
                        tmp.selected = true;
                    }
                }
                else {
                    if (typeof options[o] === "string") {
                        tmp = { value: options[o], text: options[o] };
                    }
                    else {
                        tmp = { value: options[o]["value"], text: options[o]["title"], selected: options[o]["selected"] };
                    }
                }
                s.appendChild(this.$("<option>", tmp));
            }
            if (dispatchOnChange && s.onchange) {
                s.onchange.call(s);
            }
            return s;
        }
        dom.updateSelect = updateSelect;
        function localToGlobal(tag, targetParent) {
            var p = tag;
            var poffset = { left: 0, top: 0 };
            while (p && p.tagName != "BODY") {
                poffset.left += parseFloat(p.style.left) || p.offsetLeft;
                poffset.top += parseFloat(p.style.top) || p.offsetTop;
                if (targetParent && p === targetParent) {
                    break;
                }
                p = p.parentNode;
            }
            return poffset;
        }
        dom.localToGlobal = localToGlobal;
        function globalToLocal(tag, targetParent) {
            var a = this.localToGlobal(targetParent, tag.parentNode);
            var b = this.getPosition(tag);
            return {
                left: b.left - a.left,
                top: b.top - a.top
            };
        }
        dom.globalToLocal = globalToLocal;
        function setPosition(element, pos) {
            if (element) {
                element.style.left = pos.left + "px";
                element.style.top = pos.top + "px";
            }
        }
        dom.setPosition = setPosition;
        function getInvisibleParent(element) {
            var p = element;
            while (p && (p = p.parentElement) && p.tagName != "BODY") {
                if (p.style.display == "none") {
                    return p;
                }
            }
            return null;
        }
        dom.getInvisibleParent = getInvisibleParent;
    })(dom = sg.dom || (sg.dom = {}));
})(sg || (sg = {}));
(function (sg) {
    var canvas;
    (function (canvas) {
        function drawLine(ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();
        }
        canvas.drawLine = drawLine;
        ;
        function drawDashLine(ctx, x1, y1, x2, y2, splitLineSize) {
            var path = sg.geom.splitPoint(x1, y1, x2, y2, splitLineSize);
            var i, len = path.length;
            ctx.beginPath();
            for (i = 0; i < len; i += 4) {
                if (i + 3 <= len) {
                    ctx.moveTo(path[i], path[i + 1]);
                    ctx.lineTo(path[i + 2], path[i + 3]);
                }
            }
            ctx.stroke();
            ctx.closePath();
        }
        canvas.drawDashLine = drawDashLine;
        ;
        function clear(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.beginPath();
        }
        canvas.clear = clear;
        function getRect(ctx) {
            return ctx.canvas.getBoundingClientRect();
        }
        canvas.getRect = getRect;
        function getColor(ctx, x, y) {
            var p = ctx.getImageData(x, y, 1, 1).data;
            return "#" + ("000000" + sg.math.rgbToHex(p[0], p[1], p[2])).slice(-6);
        }
        canvas.getColor = getColor;
        function getAlpha(ctx, x, y) {
            return ctx.getImageData(x, y, 1, 1).data[3];
        }
        canvas.getAlpha = getAlpha;
        function setLineStyle(ctx, lineStyle) {
            if (typeof lineStyle !== "object") {
                throw new Error("[setLineStyle] lineStyle is not object");
            }
            if (!isNaN(Number(lineStyle.thick))) {
                ctx.lineWidth = lineStyle.thick;
            }
            if (typeof lineStyle.color === "string") {
                ctx.strokeStyle = lineStyle.color;
            }
            if (!isNaN(Number(lineStyle.alpha))) {
                ctx.globalAlpha = lineStyle.alpha;
            }
        }
        canvas.setLineStyle = setLineStyle;
        var tempCtx;
        function hitTestImage(img, x, y) {
            if (!tempCtx) {
                var c = document.createElement("canvas");
                tempCtx = c.getContext("2d");
            }
            tempCtx.canvas.width = img.width;
            tempCtx.canvas.height = img.height;
            tempCtx.drawImage(img, 0, 0, img.width, img.height);
            return (canvas.getAlpha(tempCtx, x, y) != 0);
        }
        canvas.hitTestImage = hitTestImage;
    })(canvas = sg.canvas || (sg.canvas = {}));
})(sg || (sg = {}));
(function (sg) {
    var logic;
    (function (logic) {
        function getAnswerList(arr) {
            var list = [];
            var result = [];
            var j, k, i, len = 1;
            var cb = [];
            var ca = [];
            var pcount = arr.length;
            for (i = 0; i < pcount; i++) {
                list[i] = arr[i].split("|");
                ca[i] = list[i].length;
                len *= ca[i];
            }
            var cbn, tarr = [], z;
            for (i = 0; i < len; i++) {
                var tarr = [];
                z = 0;
                for (j = 0; j < pcount; j++) {
                    cb[j] = (typeof cb[j] === "undefined" || isNaN(cb[j])) ? 0 : cb[j];
                    tarr[z++] = list[j][cb[j] % ca[j]];
                    if (j == pcount - 1) {
                        cb[j]++;
                        for (k = j; k > 0; k--) {
                            if (cb[k] > 0 && cb[k] % ca[k] == 0) {
                                cb[k - 1] = Math.floor(cb[k] / ca[k]);
                            }
                        }
                    }
                }
                result[i] = tarr;
            }
            for (var i_1 = 0, li = list.length; i_1 < li; i_1++) {
                delete list[i_1];
            }
            return result;
        }
        logic.getAnswerList = getAnswerList;
    })(logic = sg.logic || (sg.logic = {}));
})(sg || (sg = {}));
(function (sg) {
    var geom;
    (function (geom) {
        function splitPoint(x1, y1, x2, y2, dotsize) {
            var p1 = { x: x1, y: y1 };
            var p2 = { x: x2, y: y2 };
            var dis = sg.math.distance(p1.x, p1.y, p2.x, p2.y);
            var num = Math.floor(dis / dotsize);
            var tempPt, i = 0, j = 0, per = dotsize / dis, arr = [];
            for (i = 1; i <= num; i++) {
                tempPt = sg.math.interpolate(p1, p2, (i) * per);
                arr[j++] = tempPt.x;
                arr[j++] = tempPt.y;
            }
            return arr;
        }
        geom.splitPoint = splitPoint;
        function intersectRect(r1, r2) {
            return !(r2.left > r1.right ||
                r2.right < r1.left ||
                r2.top > r1.bottom ||
                r2.bottom < r1.top);
        }
        geom.intersectRect = intersectRect;
        function includedRect(r1, r2) {
            return (r2.left >= r1.left &&
                r2.right <= r1.right &&
                r2.top >= r1.top &&
                r2.bottom <= r1.bottom);
        }
        geom.includedRect = includedRect;
        function pointInRect(rect, point) {
            return (rect.left < point.x && rect.top < point.y && rect.right > point.x && rect.bottom > point.y);
        }
        geom.pointInRect = pointInRect;
        function pointInRectangle(rectangle, point) {
            return (rectangle.x < point.x && rectangle.y < point.y && rectangle.x + rectangle.width > point.x && rectangle.y + rectangle.height > point.y);
        }
        geom.pointInRectangle = pointInRectangle;
        function pointInCircle(circle, point) {
            return sg.math.distance(circle.x, circle.y, point.x, point.y) <= circle.radius;
        }
        geom.pointInCircle = pointInCircle;
        function pointInVertex(vertex, point) {
            var i, j, crossCnt = 0, intersection;
            for (i = 0; i < vertex.length; i++) {
                j = (i + 1) % vertex.length;
                if ((vertex[i].y > point.y) != (vertex[j].y > point.y)) {
                    intersection = (vertex[j].x - vertex[i].x) * (point.y - vertex[i].y) / (vertex[j].y - vertex[i].y) + vertex[i].x;
                    if (point.x < intersection)
                        crossCnt++;
                }
            }
            return crossCnt % 2 > 0;
        }
        geom.pointInVertex = pointInVertex;
    })(geom = sg.geom || (sg.geom = {}));
})(sg || (sg = {}));
(function (sg) {
    var math;
    (function (math) {
        function round(n, decimalNumber) {
            return +(Math.round(+(n + "e+" + (decimalNumber || 1))) + "e-" + (decimalNumber || 1));
        }
        math.round = round;
        function distance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        }
        math.distance = distance;
        function pointToDegree(x1, y1, x2, y2) {
            return this.rad2deg(Math.atan2(y2 - y1, x2 - x1));
        }
        math.pointToDegree = pointToDegree;
        function degToRad(degree) {
            return degree * Math.PI / 180;
        }
        math.degToRad = degToRad;
        function radToDeg(radian) {
            return radian * 180 / Math.PI;
        }
        math.radToDeg = radToDeg;
        function clampAngle(angle) {
            if (angle >= 360)
                angle -= 360;
            else if (angle < 0)
                angle += 360;
            return angle;
        }
        math.clampAngle = clampAngle;
        function random(range1, range2) {
            return Math.random() * Math.abs(range1 - range2) + Math.min(range1, range2);
        }
        math.random = random;
        function range(min, max, number) {
            return (number < min) ? min : (number > max) ? max : number;
        }
        math.range = range;
        function randomColorForHex() {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        math.randomColorForHex = randomColorForHex;
        function pointToRadian(x1, y1, x2, y2) {
            return this.deg2rad(Math.atan2(y2 - y1, x2 - x1));
        }
        math.pointToRadian = pointToRadian;
        function interpolate(a, b, frac) {
            return {
                x: a.x + (b.x - a.x) * frac,
                y: a.y + (b.y - a.y) * frac
            };
        }
        math.interpolate = interpolate;
        function rgbToHex(r, g, b) {
            if (r > 255 || g > 255 || b > 255)
                throw "Invalid color component";
            return ((r << 16) | (g << 8) | b).toString(16);
        }
        math.rgbToHex = rgbToHex;
        function getAngle(x1, y1, x2, y2) {
            return Math.atan2(x2 - x1, y2 - y1) * 180 / Math.PI;
        }
        math.getAngle = getAngle;
        function distance2(p1, p2) {
            return Math.abs(Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
        }
        math.distance2 = distance2;
        function getAngle2(p1, p2) {
            return Math.atan2(p2.x - p1.x, p2.y - p1.y) * 180 / Math.PI;
        }
        math.getAngle2 = getAngle2;
        function getCoord(angle, distance) {
            angle = Math.PI * angle / 180;
            return { x: distance * Math.cos(angle), y: distance * Math.sin(angle) };
        }
        math.getCoord = getCoord;
        function getCoordFrom(from, angle, distance) {
            angle = Math.PI * angle / 180;
            return { x: from.x + distance * Math.cos(angle), y: from.y + distance * Math.sin(angle) };
        }
        math.getCoordFrom = getCoordFrom;
    })(math = sg.math || (sg.math = {}));
})(sg || (sg = {}));
(function (sg) {
    var device;
    (function (device) {
        function isDevice() {
            if (navigator.userAgent.match(/Android/i)
                || navigator.userAgent.match(/webOS/i)
                || navigator.userAgent.match(/iPhone/i)
                || navigator.userAgent.match(/iPad/i)
                || navigator.userAgent.match(/iPod/i)
                || navigator.userAgent.match(/BlackBerry/i)
                || navigator.userAgent.match(/Windows Phone/i)) {
                return true;
            }
            else {
                return false;
            }
        }
        device.isDevice = isDevice;
    })(device = sg.device || (sg.device = {}));
})(sg || (sg = {}));
(function (sg) {
    var aspen;
    (function (aspen) {
        function getWidgetClassId(apxOrApd, widgetId) {
            if (apxOrApd["screen"]) {
                try {
                    return apxOrApd.screen.objects[widgetId].create.data.wgtID;
                }
                catch (e) {
                    return null;
                }
            }
            else {
                var data = apxOrApd.getObjectByID(widgetId).data;
                if (data) {
                    return data.wgtID;
                }
                else {
                    return null;
                }
            }
        }
        aspen.getWidgetClassId = getWidgetClassId;
        function getWidgetClassTitle(apxOrApd, widgetId) {
            if (apxOrApd["screen"]) {
                try {
                    return apxOrApd.screen.objects[widgetId].create.data.wgtTitle;
                }
                catch (e) {
                    return null;
                }
            }
            else {
                var data = apxOrApd.getObjectByID(widgetId).data;
                if (data) {
                    return data.wgtTitle;
                }
                else {
                    return null;
                }
            }
        }
        aspen.getWidgetClassTitle = getWidgetClassTitle;
        function getWidgetClassIdForApd(apd, widgetId) {
            var obj = apd.getObjectByID(widgetId);
            if (obj.data) {
                return obj.data.wgtTitle;
            }
            return null;
        }
        aspen.getWidgetClassIdForApd = getWidgetClassIdForApd;
        function getStatesInfo(apdOrApx, widgetId) {
            if (!widgetId)
                return null;
            try {
                var sinfo, isExeState, layout;
                if (apdOrApx["getScreenData"]) {
                    sinfo = apn.Project.getExeStateByObjectID(apdOrApx.getData(), apdOrApx.getPageID(widgetId), widgetId);
                }
                else {
                    sinfo = apn.Project.getExeStateByObjectID(apdOrApx.project, apdOrApx.getPageID(), widgetId);
                }
                for (var i = 0; i < sinfo.length; i++) {
                    if (sinfo[i].order == undefined) {
                        sinfo[i].order = i;
                    }
                    sinfo[i].stateID = sinfo[i].stateID.replace("$APX", "");
                }
                return sinfo;
            }
            catch (e) {
                console.error("sg.aspen.getStatesInfo>>", e);
                return null;
            }
        }
        aspen.getStatesInfo = getStatesInfo;
        function hasState(apdx, widgetId, state) {
            var statesInfo = sg.aspen.getStatesInfo(apdx, widgetId);
            if (Array.isArray(state)) {
                for (var o in statesInfo) {
                    if (state.indexOf(statesInfo[o].stateID) > -1)
                        return true;
                }
            }
            else {
                for (var o in statesInfo) {
                    if (statesInfo[o].stateID == state)
                        return true;
                }
            }
            return false;
        }
        aspen.hasState = hasState;
        function getLayersInfo(apdOrApx, widgetId) {
            if (!apdOrApx || !widgetId)
                return null;
            if (apdOrApx["getScreenData"]) {
                var layout = apdOrApx.getScreenData().objects[widgetId].layout;
                if (layout) {
                    console.error("sg.aspen.getLayersInfo>>", widgetId, "layout정보가 없습니다.");
                    return layout.layers;
                }
                else {
                    return null;
                }
            }
            else {
                return apdOrApx.screen.objects[widgetId].layout.layers;
            }
        }
        aspen.getLayersInfo = getLayersInfo;
        function getLayerIdByLayerTitle(layers, title) {
            var i;
            if (!layers)
                return null;
            if (typeof (layers[0] || layers[1]).stateID === "undefined") {
                for (i in layers) {
                    if (layers[i].title == title) {
                        return layers[i].id;
                    }
                }
            }
            else {
                for (i in layers) {
                    if (layers[i].title == title) {
                        return layers[i].stateID;
                    }
                }
            }
            return null;
        }
        aspen.getLayerIdByLayerTitle = getLayerIdByLayerTitle;
        function getStateIdByLayerTitle(layers, title) {
            if (!layers)
                return null;
            var i;
            if (typeof (layers[0] || layers[1]).stateID === "undefined") {
                for (i in layers) {
                    if (layers[i].title == title) {
                        return i;
                    }
                }
            }
            else {
                for (i in layers) {
                    if (layers[i].title == title) {
                        return layers[i].stateID;
                    }
                }
            }
            return null;
        }
        aspen.getStateIdByLayerTitle = getStateIdByLayerTitle;
        function getLayerTitleByLayerId(layers, layerId) {
            if (!layers)
                return null;
            for (var i in layers) {
                if (layers[i].id == layerId) {
                    return layers[i].title;
                }
            }
            return null;
        }
        aspen.getLayerTitleByLayerId = getLayerTitleByLayerId;
        function getStateIdByLayerId(layers, layerId) {
            if (!layers)
                return null;
            for (var i in layers) {
                if (layers[i].id == layerId) {
                    return i;
                }
            }
            return null;
        }
        aspen.getStateIdByLayerId = getStateIdByLayerId;
        function getStateIdByOrder(stateInfo, order) {
            if (!stateInfo)
                return null;
            for (var i in stateInfo) {
                if (typeof stateInfo[i].order === "undefined") {
                    if (parseInt(i) == order) {
                        return stateInfo[i].stateID;
                    }
                }
                else {
                    if (stateInfo[i].order == order) {
                        return stateInfo[i].stateID;
                    }
                }
            }
            return null;
        }
        aspen.getStateIdByOrder = getStateIdByOrder;
        function getLayerTitleByStateId(layers, stateId) {
            if (!layers)
                return null;
            if (typeof (layers[0] || layers[1]).stateID === "undefined") {
                if (layers[stateId])
                    return layers[stateId].title;
            }
            else {
                for (var i in layers) {
                    if (layers[i].stateID == stateId)
                        return layers[i].title;
                }
            }
            return null;
        }
        aspen.getLayerTitleByStateId = getLayerTitleByStateId;
        function getLayerIdByStateId(layers, stateId) {
            if (!layers)
                return null;
            if (layers[stateId])
                return layers[stateId].id;
            return null;
        }
        aspen.getLayerIdByStateId = getLayerIdByStateId;
        function getLayerIdByStateId2(apx, widgetId, stateId) {
            return apn.Project.getStateLayerObjectID(apx.project, apx.getPageID(), widgetId, stateId);
        }
        aspen.getLayerIdByStateId2 = getLayerIdByStateId2;
        function getCurrentLayerId(apx, widgetId) {
            return apn.Project.getStateLayerObjectID(apx.project, apx.getPageID(), widgetId, apx.stateGetActive(widgetId));
        }
        aspen.getCurrentLayerId = getCurrentLayerId;
        function setStateById(apx, widgetId, stateId) {
            if (stateId) {
                apx.stateLayerActivate(widgetId, stateId);
                apx.stateSetActive(widgetId, stateId);
            }
        }
        aspen.setStateById = setStateById;
        function setStateByOrder(apx, widgetId, order) {
            var sid = getStateIdByOrder(getStatesInfo(apx, widgetId), order);
            if (sid) {
                apx.stateLayerActivate(widgetId, sid);
                apx.stateSetActive(widgetId, sid);
            }
        }
        aspen.setStateByOrder = setStateByOrder;
        function setStateByOrderDelay(apx, widgetId, order) {
            var sid = getStateIdByOrder(getStatesInfo(apx, widgetId), order);
            if (sid) {
                apx.stateLayerActivate(widgetId, sid);
                setTimeout(function () {
                    apx.stateSetActive(widgetId, sid);
                }, 50);
            }
        }
        aspen.setStateByOrderDelay = setStateByOrderDelay;
        function setStateByName(apx, widgetId, name) {
            var sid = getStateIdByLayerTitle(getStatesInfo(apx, widgetId), name);
            if (sid) {
                try {
                    apx.stateLayerActivate(widgetId, sid);
                    apx.stateSetActive(widgetId, sid);
                }
                catch (e) {
                    console.error("sg.aspen.setStateByName", e);
                }
                ;
            }
        }
        aspen.setStateByName = setStateByName;
        function getRootWidgetId(apx, widgetId) {
            var t;
            while ((t = apx.wgtGetParent(widgetId))) {
                widgetId = t;
            }
            return widgetId;
        }
        aspen.getRootWidgetId = getRootWidgetId;
        function wgtFilterForSameDepth(apx, parentWidgetId, ids) {
            if (ids) {
                var wobj = apx.screen.objects[parentWidgetId];
                if (wobj && wobj.layout && wobj.layout.layers) {
                    parentWidgetId = wobj.layout.layers[wobj.layout.layerIndex].id;
                }
                ids = ids.filter(function (v, i, a) {
                    return parentWidgetId === apx.wgtGetParent(v);
                });
            }
            return ids;
        }
        aspen.wgtFilterForSameDepth = wgtFilterForSameDepth;
        function getWidgetIDs(apdOrApx, moduleClass, parentWidgetId, onlyOneDepth) {
            var ids, o;
            if (apdOrApx["getScreenData"]) {
                if (typeof moduleClass == "string" || typeof moduleClass == "undefined") {
                    ids = apdOrApx.wgtByClass(parentWidgetId, moduleClass);
                }
                else {
                    ids = [];
                    for (o in moduleClass) {
                        ids = ids.concat(apdOrApx.wgtByClass(parentWidgetId, moduleClass[o]));
                    }
                }
                if (onlyOneDepth) {
                    ids = ids.filter(function (v, i, a) {
                        return parentWidgetId === getParentId(apdOrApx, v);
                    });
                }
            }
            else {
                if (typeof moduleClass == "string" || typeof moduleClass == "undefined") {
                    ids = apdOrApx.widgetsByClass(moduleClass, parentWidgetId);
                }
                else {
                    ids = [];
                    for (o in moduleClass) {
                        ids = ids.concat(apdOrApx.widgetsByClass(moduleClass[o], parentWidgetId));
                    }
                }
                if (onlyOneDepth) {
                    ids = ids.filter(function (v, i, a) {
                        return parentWidgetId === apdOrApx.wgtGetParent(v);
                    });
                }
            }
            return ids;
        }
        aspen.getWidgetIDs = getWidgetIDs;
        var WidgetType;
        (function (WidgetType) {
            WidgetType[WidgetType["BUTTON"] = 0] = "BUTTON";
            WidgetType[WidgetType["CONTAINER"] = 1] = "CONTAINER";
            WidgetType[WidgetType["BASIC"] = 2] = "BASIC";
            WidgetType[WidgetType["CONTAINER_MULTILAYER"] = 3] = "CONTAINER_MULTILAYER";
            WidgetType[WidgetType["INVISIBILITY"] = 4] = "INVISIBILITY";
            WidgetType[WidgetType["AUDIO"] = 5] = "AUDIO";
        })(WidgetType = aspen.WidgetType || (aspen.WidgetType = {}));
        function getWidgetType(apdOrApx, widgetId) {
            var scrData;
            if (apdOrApx["getScreenData"]) {
                scrData = apdOrApx["getScreenData"]();
            }
            else {
                scrData = apdOrApx["screen"];
            }
            try {
                if (!scrData.objects[widgetId]) {
                    console.error("[sg] getWidgetType:", widgetId, "는 없는 ID");
                    return;
                }
                if (scrData.objects[widgetId].layout && apn.Project.checkStateType(scrData.objects[widgetId].layout) == 2) {
                    var cid = getWidgetClassId(apdOrApx, widgetId);
                    if (cid == "sgg.wgt.button") {
                        return WidgetType.BUTTON;
                    }
                    else {
                        switch (cid) {
                            case "apn.wgt.layerContainer":
                            case "apn.wgt.pagedContainer2":
                            case "sgg.wgt.pagedContainerEx":
                            case "sgg.wgt.rotateContainer":
                                return WidgetType.CONTAINER_MULTILAYER;
                            default:
                                return WidgetType.CONTAINER;
                        }
                    }
                }
                else {
                    switch (cid) {
                        case "apn.wgt.audio":
                        case "ms.wgt.sound":
                            return WidgetType.AUDIO;
                        case "ux.wgt.cursor":
                        case "ux.wgt.count":
                        case "ux.wgt.dataTbl":
                        case "ux.wgt.http":
                        case "ux.wgt.timer":
                        case "sgg.wgt.api":
                            return WidgetType.INVISIBILITY;
                        default:
                            return WidgetType.BASIC;
                    }
                }
            }
            catch (e) {
                console.error(e);
                return null;
            }
        }
        aspen.getWidgetType = getWidgetType;
        function getRectInEdtCanvas(apd, widgetId) {
            var obj = apd.getObjectByID(widgetId);
            if (obj) {
                return {
                    x: obj.position.x + apd.getScrollX(),
                    y: obj.position.y + apd.getScrollY(),
                    width: obj.shape.w,
                    height: obj.shape.h
                };
            }
            return null;
        }
        aspen.getRectInEdtCanvas = getRectInEdtCanvas;
        function getPositionInEdtCanvas(apd, widgetId) {
            var obj = apd.getObjectByID(widgetId);
            if (obj) {
                return {
                    x: obj.position.x + apd.getScrollX(),
                    y: obj.position.y + apd.getScrollY()
                };
            }
            return null;
        }
        aspen.getPositionInEdtCanvas = getPositionInEdtCanvas;
        function getSizeInEdtCanvas(apd, widgetId) {
            var obj = apd.getObjectByID(widgetId);
            if (obj) {
                return {
                    width: obj.shape.w,
                    height: obj.shape.h
                };
            }
            return null;
        }
        aspen.getSizeInEdtCanvas = getSizeInEdtCanvas;
        function setSizeInEdtCanvas(apd, widgetId, width, height) {
            var obj = apd.getObjectByID(widgetId);
            if (obj) {
                obj.setShape(obj.shapeType, width, height);
            }
        }
        aspen.setSizeInEdtCanvas = setSizeInEdtCanvas;
        function getLinePoints(apx, widgetId) {
            var obj = apx.screen.objects[widgetId];
            if (obj) {
                return [
                    { x: obj.init.position.x + obj.init.shape.x[0], y: obj.init.position.y + obj.init.shape.y[0] },
                    { x: obj.init.position.x + obj.init.shape.x[1], y: obj.init.position.y + obj.init.shape.y[1] }
                ];
            }
            return null;
        }
        aspen.getLinePoints = getLinePoints;
        function getLinePath(apx, widgetId) {
            var obj = apx.screen.objects[widgetId];
            if (obj) {
                return [
                    obj.init.position.x + obj.init.shape.x[0], obj.init.position.y + obj.init.shape.y[0],
                    obj.init.position.x + obj.init.shape.x[1], obj.init.position.y + obj.init.shape.y[1]
                ];
            }
            return null;
        }
        aspen.getLinePath = getLinePath;
        function getChildren(apx, widgetId, options) {
            var wobj = apx.screen.objects[widgetId];
            var result = [];
            if (wobj && wobj.layout && wobj.layout.layers) {
                var lobj;
                if (options && options.stateId && getWidgetClassId(apx, widgetId) != "sgg.wgt.rotateContainer") {
                    if (!wobj.layout.layers[options.stateId]) {
                        throw options.stateId + " 에 해당하는 layer상태값이 없습니다. options.stateId를 확인하세요.";
                    }
                    lobj = apx.screen.objects[wobj.layout.layers[options.stateId].id];
                }
                else {
                    lobj = apx.screen.objects[wobj.layout.layers[wobj.layout.layerIndex].id];
                }
                if (lobj && lobj.layout) {
                    var arr = [];
                    if (options && options.ignoreScrollWgt) {
                        lobj.layout.children.map(function (v, i, a) {
                            arr = arr.concat(getBreakGroupAndScrollWgt(apx, v));
                        });
                    }
                    else {
                        lobj.layout.children.map(function (v, i, a) {
                            arr = arr.concat(getBreakGroup(apx, v));
                        });
                    }
                    arr.map(function (v, i, a) {
                        if (options) {
                            if (options.matchIds && apx.screen.objects[v].create.data && options.matchIds.indexOf(apx.screen.objects[v].create.data.wgtID) == -1)
                                return;
                            if (options.hasProperty && options.hasProperty.length) {
                                if (apx.screen.objects[v].create.data && apx.screen.objects[v].create.data.properties && apx.screen.objects[v].create.data.properties.attrs) {
                                    for (var o in options.hasProperty) {
                                        if (apx.screen.objects[v].create.data.properties.attrs[options.hasProperty[o]] == undefined)
                                            return;
                                    }
                                }
                                else {
                                    return;
                                }
                            }
                        }
                        result.push(v);
                    });
                }
            }
            return result;
        }
        aspen.getChildren = getChildren;
        function isGroup(apx, widgetId) {
            return moduleCheck(apx, widgetId, ["bx.CEditorWnd.CGroup"]);
        }
        aspen.isGroup = isGroup;
        function getBreakGroup(apx, widgetId) {
            var arr = [], list = [widgetId], i = 0;
            while (i < list.length) {
                if (isGroup(apx, list[i])) {
                    if (apx.screen.objects[list[i]].layout) {
                        list = list.concat(apx.screen.objects[list[i]].layout.children);
                    }
                }
                else {
                    arr.push(list[i]);
                }
                i++;
            }
            return arr;
        }
        aspen.getBreakGroup = getBreakGroup;
        function isScrollWidget(apx, widgetId, onlyOriginScrollWgt) {
            if (onlyOriginScrollWgt) {
                return (getWidgetClassId(apx, widgetId) == "apn.wgt.scrollContainer");
            }
            return moduleCheck(apx, widgetId, ["apn.CScrollContainer"]);
        }
        aspen.isScrollWidget = isScrollWidget;
        function moduleCheck(apx, widgetId, moduleNames) {
            if (apx.screen.objects[widgetId] && moduleNames.indexOf(apx.screen.objects[widgetId].module) > -1) {
                return true;
            }
            return false;
        }
        aspen.moduleCheck = moduleCheck;
        function getBreakGroupAndScrollWgt(apx, widgetId) {
            var arr = [], list = [widgetId], i = 0, o;
            while (i < list.length) {
                if (isGroup(apx, list[i])) {
                    if (apx.screen.objects[list[i]].layout) {
                        list = list.concat(apx.screen.objects[list[i]].layout.children);
                    }
                }
                else if (isScrollWidget(apx, list[i], true)) {
                    if (apx.screen.objects[list[i]].layout) {
                        o = apx.screen.objects[apx.screen.objects[list[i]].layout.layers[apx.screen.objects[list[i]].layout.layerIndex].id];
                        if (o.layout && o.layout.children) {
                            list = list.concat(o.layout.children);
                        }
                    }
                }
                else {
                    arr.push(list[i]);
                }
                i++;
            }
            return arr;
        }
        aspen.getBreakGroupAndScrollWgt = getBreakGroupAndScrollWgt;
        function dispatchReset(apx, widgetId, stateId) {
            var j, idsWgt;
            var msg = apx.wgtGetProperty(widgetId, "fireReset");
            if (msg == "아니오")
                return;
            idsWgt = sg.aspen.getChildren(apx, widgetId, { hasProperty: ["sgReset"], stateId: stateId, ignoreScrollWgt: true });
            for (j = 0; j < idsWgt.length; j++) {
                apx.wgtSetProperty(idsWgt[j], "sgReset", msg);
            }
        }
        aspen.dispatchReset = dispatchReset;
        function playAudio(apx, audioId, direct) {
            if (direct === void 0) { direct = false; }
            if (direct) {
                apx.wgtControlMedia(audioId, "play");
            }
            else {
                apx.wgtSetProperty(audioId, "apxState", "play");
            }
        }
        aspen.playAudio = playAudio;
        function stopAudio(apx, audioId, direct) {
            if (direct === void 0) { direct = false; }
            if (direct) {
                apx.wgtControlMedia(audioId, "stop");
            }
            else {
                if (apx.wgtGetProperty(audioId, "apxState") != "stop") {
                    apx.wgtSetProperty(audioId, "apxState", "stop");
                }
            }
        }
        aspen.stopAudio = stopAudio;
        function playEmbededAudio(apx, widgetId, direct) {
            if (direct === void 0) { direct = false; }
            var j, idsMedia = apx.getWidgetsByProperty("apxMediaControl", widgetId);
            for (j = 0; j < idsMedia.length; j++) {
                this.playAudio(apx, idsMedia[j], direct);
            }
        }
        aspen.playEmbededAudio = playEmbededAudio;
        function stopEmbededAudio(apx, widgetId, direct) {
            if (direct === void 0) { direct = false; }
            var j, idsMedia = apx.getWidgetsByProperty("apxMediaControl", widgetId);
            for (j = 0; j < idsMedia.length; j++) {
                this.stopAudio(apx, idsMedia[j], direct);
            }
        }
        aspen.stopEmbededAudio = stopEmbededAudio;
        function stopAllAudio(apx, direct, exceptions) {
            if (direct === void 0) { direct = false; }
            var j, idsMedia = apx.getWidgetsByProperty("apxMediaControl");
            for (j = 0; j < idsMedia.length; j++) {
                if (exceptions && exceptions.indexOf(idsMedia[j]) > -1)
                    continue;
                this.stopAudio(apx, idsMedia[j], direct);
            }
        }
        aspen.stopAllAudio = stopAllAudio;
        var aniWgtIds = ["ux.wgt.imgSprite", "ux.wgt.shtSprite", "edu.wgt.animScene", "edu.wgt.animSprite", "sgg.wgt.animateCC"];
        function playEmbededAnimation(apx, widgetId, onlyOneDepth, exceptAniCC) {
            var list = aniWgtIds.slice();
            if (exceptAniCC) {
                sg.utils.remove(list, "sgg.wgt.animateCC");
            }
            var j, idsWgt = sg.aspen.getWidgetIDs(apx, list, widgetId, onlyOneDepth);
            for (j = 0; j < idsWgt.length; j++) {
                apx.wgtSetProperty(idsWgt[j], "apxState", "play");
            }
        }
        aspen.playEmbededAnimation = playEmbededAnimation;
        function stopEmbededAnimation(apx, widgetId, onlyOneDepth, exceptAniCC, stopAtLast) {
            var list = aniWgtIds.slice();
            if (exceptAniCC) {
                sg.utils.remove(list, "sgg.wgt.animateCC");
            }
            var j, idsWgt = sg.aspen.getWidgetIDs(apx, list, widgetId, onlyOneDepth), cid;
            for (j = 0; j < idsWgt.length; j++) {
                if (stopAtLast) {
                    cid = sg.aspen.getWidgetClassId(apx, idsWgt[j]);
                    if (cid == "edu.wgt.animScene") {
                        apx.wgtSetProperty(idsWgt[j], "apxState", "stopL");
                    }
                    else if (cid == "sgg.wgt.animateCC") {
                        apx.wgtSetProperty(idsWgt[j], "apxState", "stopAtLast");
                    }
                    else {
                        if (apx.wgtGetProperty(idsWgt[j], "apxState") !== "stop")
                            apx.wgtSetProperty(idsWgt[j], "apxState", "stop");
                    }
                }
                else {
                    if (apx.wgtGetProperty(idsWgt[j], "apxState") !== "stop")
                        apx.wgtSetProperty(idsWgt[j], "apxState", "stop");
                }
            }
        }
        aspen.stopEmbededAnimation = stopEmbededAnimation;
        function getParentId(apxOrApd, widgetId, exceptGroup) {
            if (exceptGroup === void 0) { exceptGroup = true; }
            return apn.Project.findParentOf((apxOrApd["screen"] ? apxOrApd["screen"] : apxOrApd["getScreenData"]()), widgetId, undefined, exceptGroup);
        }
        aspen.getParentId = getParentId;
        function isEditMode(apd, widgetId) {
            return apd.getContainerID() == widgetId && apd.editSubMode == apn.CEditorS.SUBMODE_LAYER;
        }
        aspen.isEditMode = isEditMode;
        function getScale(apx) {
            return apx ? { x: apx.viewer.getStretchX(), y: apx.viewer.getStretchY() } : sg.dom.getScale(document.getElementById("bx$PageManager_1"));
        }
        aspen.getScale = getScale;
        function getPageTag(tag) {
            var p = tag.parentNode;
            while (p && p.tagName != "BODY") {
                if (p.id.indexOf("bx$Page_") > -1) {
                    return p;
                }
                p = p.parentNode;
            }
            return null;
        }
        aspen.getPageTag = getPageTag;
        function getPageOffset(tag) {
            var p = tag;
            var poffset = { left: 0, top: 0 };
            while (p && p.tagName != "BODY") {
                poffset.left += p.offsetLeft;
                poffset.top += p.offsetTop;
                if (p.id.indexOf("bx$Page_") > -1) {
                    break;
                }
                p = p.parentNode;
            }
            return poffset;
        }
        aspen.getPageOffset = getPageOffset;
        function resetScrollWidgets(apx, containerWidgetId, onlyOneDepth) {
            var pageTag = sg.aspen.getPageTag(apx.wgtTag(containerWidgetId));
            sg.aspen.getWidgetIDs(apx, "apn.wgt.scrollContainer", containerWidgetId, onlyOneDepth).map(function (v, i, a) {
                var tag = apx.wgtTag(v);
                if (!tag.offsetParent) {
                    var btag = tag, list = [];
                    while (tag !== pageTag) {
                        if (tag.style.display == "none") {
                            list.push(tag);
                            tag.style.display = "block";
                        }
                        tag = tag.parentElement;
                    }
                    btag.scrollTop = 0;
                    btag.scrollLeft = 0;
                    for (var o in list) {
                        list[o].style.display = "none";
                    }
                    apx.wgtSetProperty(v, "scrollX", 0, true);
                    apx.wgtSetProperty(v, "scrollY", 0, true);
                }
                else {
                    apx.wgtSetProperty(v, "scrollX", 0);
                    apx.wgtSetProperty(v, "scrollY", 0);
                }
            });
        }
        aspen.resetScrollWidgets = resetScrollWidgets;
        function getWidgetCreateData(prj, pageId, widgetId) {
            try {
                return prj.pages[pageId].objects[widgetId].create.data;
            }
            catch (e) {
                console.error(e);
                return null;
            }
        }
        aspen.getWidgetCreateData = getWidgetCreateData;
        function setVisible(apx, widgetId, bool) {
            apx.runITR({ action: "CWP", target: { objectID: widgetId }, set: { visibility: bool ? "Show" : "Hide" } });
        }
        aspen.setVisible = setVisible;
    })(aspen = sg.aspen || (sg.aspen = {}));
})(sg || (sg = {}));
(function (sg) {
    var aspen;
    (function (aspen) {
        var wgt;
        (function (wgt) {
            function addWidget(info, createFunc) {
                console.info(info.wgtName, info.version);
                regist(create(createFunc, info.inheritWidget), info.wgtName, info.version);
            }
            wgt.addWidget = addWidget;
            var publicMethods = [
                "destroyData", "getData", "setData", "setDatas", "setAttrs", "setState", "setAttrUI", "setStateUI", "setStyleUI", "setAttrRuntimeUI", "setResetUI", "setResetCallback", "setResetLastState", "log", "Elog"
            ];
            function createPublicMethod(xa, methodNames, prefix) {
                if (prefix === void 0) { prefix = "sg"; }
                publicMethods.map(function (v, i, a) {
                    if (sg.aspen.wgt[v]) {
                        var fn = prefix + v[0].toUpperCase() + v.substr(1);
                        xa[fn] = function () {
                            var a = Array.prototype.slice.call(arguments);
                            a.splice(0, 0, xa);
                            return sg.aspen.wgt[v].apply(xa, a);
                        };
                    }
                });
            }
            wgt.createPublicMethod = createPublicMethod;
            function create(createFunc, inheritWidget) {
                var xa = (inheritWidget || {});
                xa.dynamic = {
                    _data_: {}
                };
                createPublicMethod(xa, publicMethods);
                createFunc(xa);
                return xa;
            }
            wgt.create = create;
            function regist(xa, wgtName, version) {
                xa.version = version || "0.1";
                xa.sgSetAttrs({ version: xa.version });
                xa.wgtName = wgtName;
                window[wgtName] = xa;
            }
            wgt.regist = regist;
            function setResetUI(xa) {
                setAttrs(xa, {
                    sgReset: "",
                    fireReset: "예"
                });
                setAttrUI(xa, {
                    fireReset: {
                        title: "Reset여부",
                        input: ["예", "아니오"]
                    }
                });
            }
            wgt.setResetUI = setResetUI;
            var _logCss = "background: #222; color: #bada55";
            function log(xa) {
                var msg = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    msg[_i - 1] = arguments[_i];
                }
                if (xa.debug == false)
                    return;
                var ar = Array.prototype.slice.call(arguments);
                if (isChrome) {
                    ar[0] = xa.sgLogCss || _logCss;
                    ar.unshift("%c<" + xa.wgtName + ">");
                    console.log.apply(console, ar);
                }
                else {
                    ar[0] = "<" + xa.wgtName + ">";
                    console.log.apply(console, ar);
                }
            }
            wgt.log = log;
            function Elog(xa) {
                var msg = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    msg[_i - 1] = arguments[_i];
                }
                if (xa.debug == false)
                    return;
                var ar = Array.prototype.slice.call(arguments);
                if (isChrome) {
                    ar[0] = xa.sgLogCss || _logCss;
                    ar.unshift("%c<" + xa.wgtName + ">");
                    console.error.apply(console, ar);
                }
                else {
                    ar[0] = "<" + xa.wgtName + ">";
                    console.error.apply(console, ar);
                }
            }
            wgt.Elog = Elog;
            function setResetCallback(xa, apx, widgetId, onReset, dontDispatch) {
                apx.wgtListenProperty(widgetId, "sgReset", function (_widgetId, value) {
                    if (widgetId == _widgetId) {
                        var msg = apx.wgtGetProperty(widgetId, "fireReset");
                        if (msg == "아니오")
                            return;
                        if (onReset) {
                            onReset.call(xa, msg);
                            if (msg && !dontDispatch) {
                                sg.aspen.dispatchReset(apx, widgetId, apx.wgtGetProperty(widgetId, "sgResetState"));
                            }
                        }
                    }
                });
            }
            wgt.setResetCallback = setResetCallback;
            function fireSgReset(xa, apx, widgetId) {
                var fr = apx.wgtGetProperty(widgetId, "fireReset");
                if (fr == "아니오")
                    return;
                apx.wgtSetProperty(widgetId, "sgReset", fr);
            }
            wgt.fireSgReset = fireSgReset;
            function setResetLastState(xa, apx, widgetId, stateId) {
                apx.wgtSetProperty(widgetId, "sgResetState", stateId);
            }
            wgt.setResetLastState = setResetLastState;
            function destroyData(xa, widgetId) {
                if (xa.dynamic._data_[widgetId]) {
                    var obj = xa.dynamic._data_[widgetId];
                    for (var o in obj) {
                        delete obj[o];
                    }
                    obj = null;
                }
            }
            wgt.destroyData = destroyData;
            function getData() {
                var rest = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    rest[_i] = arguments[_i];
                }
                var xa, widgetId, key;
                if (rest.length == 2) {
                    xa = rest[0];
                    key = rest[1];
                    return xa.dynamic._data_[key] || (xa.dynamic._data_[key] = {});
                }
                else if (rest.length == 3) {
                    xa = rest[0];
                    widgetId = rest[1];
                    key = rest[2];
                    if (key) {
                        return (xa.dynamic._data_[widgetId] || (xa.dynamic._data_[widgetId] = {}))[key];
                    }
                    return xa.dynamic._data_[widgetId] || (xa.dynamic._data_[widgetId] = {});
                }
                return null;
            }
            wgt.getData = getData;
            function setData() {
                var rest = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    rest[_i] = arguments[_i];
                }
                var xa, key, value, widgetId;
                if (rest.length == 3) {
                    xa = rest[0];
                    key = rest[1];
                    value = rest[2];
                    return xa.dynamic._data_[key] = value;
                }
                else if (rest.length == 4) {
                    xa = rest[0];
                    widgetId = rest[1];
                    key = rest[2];
                    value = rest[3];
                    return (xa.dynamic._data_[widgetId] || (xa.dynamic._data_[widgetId] = {}))[key] = value;
                }
            }
            wgt.setData = setData;
            function setDatas() {
                var rest = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    rest[_i] = arguments[_i];
                }
                var xa, data, widgetId, o;
                if (rest.length == 2) {
                    xa = rest[0];
                    data = rest[1];
                    for (o in data) {
                        setData(xa, o, data[o]);
                    }
                }
                else if (rest.length == 3) {
                    xa = rest[0];
                    widgetId = rest[1];
                    data = rest[2];
                    for (o in data) {
                        setData(xa, widgetId, o, data[o]);
                    }
                }
            }
            wgt.setDatas = setDatas;
            function setAttrs(xa, attrs, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setAttrs] wrong param");
                    return;
                }
                xa.properties = xa.properties || {};
                xa.properties.attrs = xa.properties.attrs || {};
                sg.utils.unionMerge(xa.properties.attrs, attrs, overwrite);
            }
            wgt.setAttrs = setAttrs;
            function setState(xa, state, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setState] wrong param");
                    return;
                }
                xa.properties = xa.properties || {};
                xa.properties.state = overwrite ? state : xa.properties.state || state;
            }
            wgt.setState = setState;
            function setAttrUI(xa, attrsUI, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setAttrUI] wrong param");
                    return;
                }
                xa.editor = xa.editor || {};
                xa.editor.properties = xa.editor.properties || {};
                xa.properties = xa.properties || {};
                xa.properties.attrs = xa.properties.attrs || {};
                sg.utils.unionMerge(xa.editor.properties, attrsUI, overwrite);
                for (var o in attrsUI) {
                    if (xa.properties.attrs[o] === undefined) {
                        if (typeof attrsUI[o].input === "object") {
                            xa.properties.attrs[o] = attrsUI[o].input[0]["value"];
                        }
                        else {
                            xa.properties.attrs[o] = attrsUI[o].input;
                        }
                    }
                }
            }
            wgt.setAttrUI = setAttrUI;
            function setStateUI(xa, states, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setStateUI] wrong param");
                    return;
                }
                xa.editor = xa.editor || {};
                xa.editor.states = xa.editor.states || {};
                sg.utils.unionMerge(xa.editor.states, states, overwrite);
                var firstState = sg.utils.keys(states)[0];
                if (firstState)
                    setState(xa, firstState, false);
            }
            wgt.setStateUI = setStateUI;
            function setStyleUI(xa, map, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setStyleUI] wrong param");
                    return;
                }
                xa.styleMap = xa.styleMap || {};
                sg.utils.unionMerge(xa.styleMap, map, overwrite);
            }
            wgt.setStyleUI = setStyleUI;
            function setAttrRuntimeUI(xa, attrsUI, overwrite) {
                if (overwrite === void 0) { overwrite = true; }
                if (!xa) {
                    console.error("[setAttrRuntimeUI] wrong param");
                    return;
                }
                xa.editor = xa.editor || {};
                xa.editor.runtimeProperties = xa.editor.runtimeProperties || {};
                sg.utils.unionMerge(xa.editor.runtimeProperties, attrsUI, overwrite);
                var attrs = {};
                for (var o in attrsUI) {
                    attrs[o] = "";
                }
                setAttrs(xa, attrs, false);
            }
            wgt.setAttrRuntimeUI = setAttrRuntimeUI;
        })(wgt = aspen.wgt || (aspen.wgt = {}));
    })(aspen = sg.aspen || (sg.aspen = {}));
})(sg || (sg = {}));
(function (sg) {
    var aspen;
    (function (aspen) {
        var EVENT;
        (function (EVENT) {
            EVENT.TAP = "click";
            EVENT.DRAG_START = "dragStart";
            EVENT.DRAG_END = "dragEnd";
            EVENT.DROP = "dragDrop";
            EVENT.DROP_RESULT = "dragDropResult";
            EVENT.STATE_CHANGE = "stateChange";
            EVENT.MEDIA = "media";
            EVENT.ANIMATION = "animation";
        })(EVENT = aspen.EVENT || (aspen.EVENT = {}));
    })(aspen = sg.aspen || (sg.aspen = {}));
})(sg || (sg = {}));
(function (sg) {
    var utils;
    (function (utils) {
        function strCut(str, limit, displayStr) {
            if (str.length > limit) {
                if (!displayStr) {
                    displayStr = "…";
                }
                return str.substr(0, limit - displayStr.length) + displayStr;
            }
            else {
                return str;
            }
        }
        utils.strCut = strCut;
        function hasFlashPlugin() {
            return !!this.getFlashVersion();
        }
        utils.hasFlashPlugin = hasFlashPlugin;
        function getFlashVersion() {
            try {
                try {
                    var axo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.6');
                    try {
                        axo.AllowScriptAccess = 'always';
                    }
                    catch (e) {
                        return '6,0,0';
                    }
                }
                catch (e) { }
                return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version').replace(/\D+/g, ',').match(/^,?(.+),?$/)[1];
            }
            catch (e) {
                try {
                    if (navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin) {
                        return (navigator.plugins["Shockwave Flash 2.0"] || navigator.plugins["Shockwave Flash"]).description.replace(/\D+/g, ",").match(/^,?(.+),?$/)[1];
                    }
                }
                catch (e) { }
            }
            return null;
        }
        utils.getFlashVersion = getFlashVersion;
        var flashInstallPopup;
        function openFlashInstallLinkPopup(doc) {
            doc = doc || document;
            if (!flashInstallPopup) {
                var div = doc.createElement("div");
                div.id = "flashInstallPopup";
                div.setAttribute("style", [
                    "position: absolute",
                    "top: 0",
                    "left: 0",
                    "z-index: 999999999",
                    "background: rgba(0, 0, 0, 0.5)",
                    "width: 100%",
                    "height: 100%",
                    "filter: alpha(opacity=50)"
                ].join(";"));
                div.innerHTML = "<div style='overflow: hidden;position: absolute;z-index: 1000000;top: 50%;left: 50%;margin: -110px 0 0 -148px;width: 297px;height: 220px;background: url(//t1.daumcdn.net/localimg/localimages/07/2017/pc/alert_flash10b_170620.png) no-repeat;_filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\"//t1.daumcdn.net/localimg/localimages/07/2017/pc/alert_flash10b_170620.png\");_background: 0;'>" +
                    '<span class="close" onclick="this.parentElement.parentElement.parentElement.removeChild(this.parentElement.parentElement);" style="overflow: hidden;position: absolute;top: 6px;right: 6px;width: 16px;height: 16px;cursor: pointer;text-indent: -9999px;">닫기</span>' +
                    '<a class="download" style="overflow: hidden;position: absolute;top: 131px;left: 86px;width: 125px;height: 28px;cursor: pointer;text-indent: -9999px;" href="http://get.adobe.com/flashplayer/" target="_blank">최신버전 다운로드</a>' +
                    '<a class="helplink" style="cursor:pointer;font-size:10pt;position:absolute;left:40%;bottom:7px" href="https://support.google.com/chrome/answer/6258784?hl=ko" target="_blank">크롬</a>' +
                    '<a class="helplink" style="cursor:pointer;font-size:10pt;position:absolute;left:55%;bottom:7px" href="https://helpx.adobe.com/kr/flash-player/kb/install-flash-player-windows.html" target="_blank">IE</a>' +
                    '</div>';
                flashInstallPopup = div;
            }
            document.body.style.backgroundColor =
                doc.body.appendChild(flashInstallPopup);
        }
        utils.openFlashInstallLinkPopup = openFlashInstallLinkPopup;
        function unionMerge(origin, newObj, overwrite) {
            if (overwrite === void 0) { overwrite = true; }
            if (!origin || !newObj)
                return;
            for (var o in newObj) {
                if (!overwrite && origin[o] !== undefined)
                    continue;
                if (newObj[o] === undefined) {
                    delete origin[o];
                }
                else {
                    origin[o] = newObj[o];
                }
            }
        }
        utils.unionMerge = unionMerge;
        function unionMergeR(origin, newObj, overwrite) {
            if (overwrite === void 0) { overwrite = true; }
            if (!origin || !newObj)
                return origin || newObj || null;
            var o, obj = {};
            for (o in origin) {
                if (overwrite && newObj[o] !== undefined)
                    continue;
                obj[o] = origin[o];
            }
            for (o in newObj) {
                obj[o] = newObj[o];
            }
            return obj;
        }
        utils.unionMergeR = unionMergeR;
        function intersectMerge(origin, newObj) {
            if (!origin || !newObj)
                return;
            for (var o in origin) {
                if (newObj[o] !== undefined) {
                    origin[o] = newObj[o];
                }
            }
        }
        utils.intersectMerge = intersectMerge;
        function keys(obj) {
            if (!obj)
                return [];
            var arr = [];
            for (var i in obj) {
                arr.push(i);
            }
            return arr;
        }
        utils.keys = keys;
        function remove(obj, v, prop, all) {
            if (typeof obj !== "object" || !obj)
                return;
            if (prop) {
                var i;
                if (Array.isArray(obj)) {
                    if (all) {
                        for (i = 0; i < obj.length; i++) {
                            if (obj[i] && typeof obj[i] === "object") {
                                if (obj[i][prop] == v) {
                                    obj.splice(i, 1);
                                    return;
                                }
                            }
                        }
                    }
                    else {
                        for (i = 0; i < obj.length; i++) {
                            if (obj[i] && typeof obj[i] === "object") {
                                if (obj[i][prop] == v) {
                                    obj.splice(i, 1);
                                    i--;
                                }
                            }
                        }
                    }
                }
                else {
                    if (all) {
                        for (i in obj) {
                            if (obj[i][prop] == v) {
                                delete obj[i];
                            }
                        }
                    }
                    else {
                        for (i in obj) {
                            if (obj[i][prop] == v) {
                                delete obj[i];
                                return;
                            }
                        }
                    }
                }
            }
            else {
                if (Array.isArray(obj)) {
                    if (all) {
                        while ((i = obj.indexOf(v)) != -1) {
                            obj.splice(i, 1);
                        }
                    }
                    else {
                        if ((i = obj.indexOf(v)) != -1) {
                            obj.splice(i, 1);
                        }
                    }
                }
                else {
                    delete obj[v];
                }
            }
        }
        utils.remove = remove;
        var color;
        (function (color) {
            function rgb2hex(rgb) {
                var a = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
                return (a && a.length === 4) ? "#" +
                    ("0" + parseInt(a[1], 10).toString(16)).slice(-2) +
                    ("0" + parseInt(a[2], 10).toString(16)).slice(-2) +
                    ("0" + parseInt(a[3], 10).toString(16)).slice(-2) : rgb;
            }
            color.rgb2hex = rgb2hex;
            function getAlphaFromRbga(rgba) {
                var a = rgba.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?([\d.]+)[\s+]?/i);
                return (a && a.length === 5) ? parseFloat(a[4]) : 1;
            }
            color.getAlphaFromRbga = getAlphaFromRbga;
            function hex2rgb(hex) {
                if (hex.charAt(0) != "#")
                    return hex;
                return "rgb(" + parseInt(hex.charAt(1) + hex.charAt(2), 16) + "," +
                    parseInt(hex.charAt(3) + hex.charAt(4), 16) + "," +
                    parseInt(hex.charAt(5) + hex.charAt(6), 16) + ")";
            }
            color.hex2rgb = hex2rgb;
            function hex2rgba(hex, alpha) {
                if (hex.charAt(0) != "#")
                    return hex;
                return "rgba(" + parseInt(hex.charAt(1) + hex.charAt(2), 16) + "," +
                    parseInt(hex.charAt(3) + hex.charAt(4), 16) + "," +
                    parseInt(hex.charAt(5) + hex.charAt(6), 16) + "," +
                    alpha + ")";
            }
            color.hex2rgba = hex2rgba;
        })(color = utils.color || (utils.color = {}));
        var Base64;
        (function (Base64) {
            Base64._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            function encode(input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;
                input = this._utf8_encode(input);
                while (i < input.length) {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    }
                    else if (isNaN(chr3)) {
                        enc4 = 64;
                    }
                    output = output +
                        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
                }
                return output;
            }
            Base64.encode = encode;
            ;
            function decode(input) {
                var output = "";
                var chr1, chr2, chr3;
                var enc1, enc2, enc3, enc4;
                var i = 0;
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
                while (i < input.length) {
                    enc1 = this._keyStr.indexOf(input.charAt(i++));
                    enc2 = this._keyStr.indexOf(input.charAt(i++));
                    enc3 = this._keyStr.indexOf(input.charAt(i++));
                    enc4 = this._keyStr.indexOf(input.charAt(i++));
                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;
                    output = output + String.fromCharCode(chr1);
                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2);
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3);
                    }
                }
                output = this._utf8_decode(output);
                return output;
            }
            Base64.decode = decode;
            function _utf8_encode(string) {
                string = string.replace(/\r\n/g, "\n");
                var utftext = "";
                for (var n = 0; n < string.length; n++) {
                    var c = string.charCodeAt(n);
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }
                return utftext;
            }
            Base64._utf8_encode = _utf8_encode;
            function _utf8_decode(utftext) {
                var string = "";
                var i = 0;
                var c, c1, c2, c3;
                c = c1 = c2 = 0;
                while (i < utftext.length) {
                    c = utftext.charCodeAt(i);
                    if (c < 128) {
                        string += String.fromCharCode(c);
                        i++;
                    }
                    else if ((c > 191) && (c < 224)) {
                        c2 = utftext.charCodeAt(i + 1);
                        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                        i += 2;
                    }
                    else {
                        c2 = utftext.charCodeAt(i + 1);
                        c3 = utftext.charCodeAt(i + 2);
                        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                        i += 3;
                    }
                }
                return string;
            }
            Base64._utf8_decode = _utf8_decode;
        })(Base64 = utils.Base64 || (utils.Base64 = {}));
    })(utils = sg.utils || (sg.utils = {}));
})(sg || (sg = {}));
(function (sg) {
    var utils;
    (function (utils) {
        var CircularQueue = (function () {
            function CircularQueue(size) {
                this.queue = [];
                this.read = 0;
                this.write = 0;
                this.max = size;
                while (size > 0) {
                    this.queue.push(null);
                    size--;
                }
            }
            CircularQueue.prototype.each = function (callback) {
                var c = this.read;
                while (this.queue[c]) {
                    callback(this.queue[c++]);
                    c = c % (this.max + 1);
                }
            };
            CircularQueue.prototype.count = function () {
                var c = 0;
                for (var i = 0; i <= this.max; i++) {
                    if (this.queue[i] != null) {
                        c++;
                    }
                }
                return c;
            };
            CircularQueue.prototype.checkEmpty = function () {
                var count = 0;
                for (var i = 0; i <= this.max; i++) {
                    if (this.queue[i] == null) {
                        count++;
                    }
                }
                if (count == this.max + 1) {
                    return true;
                }
                return false;
            };
            CircularQueue.prototype.checkFull = function () {
                var count = 0;
                for (var i = 0; i <= this.max; i++) {
                    if (this.queue[i] == null) {
                        count++;
                    }
                }
                if (count > 0) {
                    return false;
                }
                return true;
            };
            CircularQueue.prototype.print = function () {
                return this.queue;
            };
            CircularQueue.prototype.enqueue = function (item) {
                if (!this.checkFull()) {
                    this.queue[this.write] = item;
                    this.write = (this.write + 1) % (this.max + 1);
                }
                return item;
            };
            CircularQueue.prototype.dequeue = function () {
                if (!this.checkEmpty()) {
                    var val = this.queue[this.read];
                    this.queue[this.read] = null;
                    this.read = (this.read + 1) % (this.max + 1);
                    return val;
                }
                else
                    return null;
            };
            return CircularQueue;
        }());
        utils.CircularQueue = CircularQueue;
    })(utils = sg.utils || (sg.utils = {}));
})(sg || (sg = {}));
