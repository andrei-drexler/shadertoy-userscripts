// ==UserScript==
// @name         Shadertoy WebGL 1
// @namespace    http://tampermonkey.net/
// @version      0.1.20190716
// @description  Force WebGL 1 on Shadertoy
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let canvas = document.getElementById("demogl");
    if (canvas) {
        let oldGetContext = canvas.getContext;
        canvas.getContext = function(contextType, options) {
            return contextType == "webgl2" || contextType == "experimental-webgl2" ? null : oldGetContext.call(this, contextType, options);
        };
    }
})();
