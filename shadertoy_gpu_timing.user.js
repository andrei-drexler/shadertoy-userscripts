// ==UserScript==
// @name         Shadertoy GPU timing
// @namespace    http://tampermonkey.net/
// @version      0.5.20190706
// @description  Per-pass GPU timing HUD (click framerate display to toggle)
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* global gShaderToy, piRenderer:true, piRequestFullScreen:true, EffectPass:true */
/* eslint curly: 0, no-multi-spaces: 0 */

(function() {
    'use strict';

    const NUM_QUERIES = 4,
          HUD_WIDTH = 120,
          FONT = "12px Tahoma, Arial",
          HI_COLOR = [255, 128, 64],
          MED_COLOR = [255, 255, 128],
          LO_COLOR = [255, 255, 255],
          LINE_HEIGHT = 18,
          MARGIN_Y = 4,
          MARGIN_X = 8;

    let canvas = document.getElementById("demogl");
    if (!canvas) {
        console.log("Couldn't find canvas, GPU timing disabled");
        return;
    }

    /* override renderer initialization to grab extension */
    let mTimingSupport = undefined;
    let oldRenderer = piRenderer;
    piRenderer = function() {
        let renderer = oldRenderer();
        let init = renderer && renderer.Initialize;
        if (init) {
            renderer.Initialize = function(gl) {
                let result = init(gl);
                if (!result || !gl)
                    return result;

                let ext = gl instanceof WebGL2RenderingContext && gl.getExtension('EXT_disjoint_timer_query_webgl2');
                if (ext) {
                    console.log("Found EXT_disjoint_timer_query_webgl2 extension");
                    mTimingSupport = {
                        createQuery:   function()      { return gl.createQuery(); },
                        deleteQuery:   function(query) { return gl.deleteQuery(query); },
                        beginQuery:    function(query) { return gl.beginQuery(ext.TIME_ELAPSED_EXT, query); },
                        endQuery:      function()      { return gl.endQuery(ext.TIME_ELAPSED_EXT); },
                        isAvailable:   function(query) { return gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE); },
                        isDisjoint:    function()      { return gl.getParameter(ext.GPU_DISJOINT_EXT); },
                        getResult:     function(query) { return gl.getQueryParameter(query, gl.QUERY_RESULT); }
                    };
                    return result;
                }

                ext = gl instanceof WebGLRenderingContext && gl.getExtension('EXT_disjoint_timer_query');
                if (ext) {
                    console.log("Found EXT_disjoint_timer_query extension");
                    mTimingSupport = {
                        createQuery:   function()      { return ext.createQueryEXT(); },
                        deleteQuery:   function(query) { return ext.deleteQueryEXT(query); },
                        beginQuery:    function(query) { return ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query); },
                        endQuery:      function()      { return ext.endQueryEXT(ext.TIME_ELAPSED_EXT); },
                        isAvailable:   function(query) { return ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT); },
                        isDisjoint:    function()      { return gl.getParameter(ext.GPU_DISJOINT_EXT); },
                        getResult:     function(query) { return ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT); }
                    };
                    return result;
                }

                console.log("Timing extension not found, timing disabled.");
                return result;
            };
        }
        return renderer;
    };

    /* override pass initialization to create timer queries */
    let oldEffectPassCreate = EffectPass.prototype.Create;
    EffectPass.prototype.Create = function(...args) {
        let result = oldEffectPassCreate.apply(this, args);
        if (mTimingSupport && this.mType != "common" && this.mType != "sound") {
            this.mTiming = {
                query: Array.from({length: NUM_QUERIES}, () => mTimingSupport.createQuery()),
                cursor: 0,
                wait: NUM_QUERIES,
                accumTime: 0,
                accumSamples: 0
            };
        }
        return result;
    };

    /* override pass cleanup to delete timer queries */
    let oldEffectPassDestroy = EffectPass.prototype.Destroy;
    EffectPass.prototype.Destroy = function(...args) {
        if (this.mTiming) {
            for (let query of this.mTiming.query)
                mTimingSupport.deleteQuery(query);
            this.mTiming = null;
        }
        return oldEffectPassDestroy.apply(this, args);
    };

    /* override pass drawing function to issue timer queries */
    let oldEffectPassPaint = EffectPass.prototype.Paint;
    EffectPass.prototype.Paint = function(...args) {
        let timing = this.mTiming;
        if (timing) {
            mTimingSupport.beginQuery(timing.query[timing.cursor]);
        }
        let result = oldEffectPassPaint.apply(this, args);
        if (timing) {
            mTimingSupport.endQuery();
            timing.cursor = (timing.cursor + 1) % timing.query.length;
            if (timing.wait > 0) {
                --timing.wait;
            } else {
                let prev = timing.cursor;
                let available = mTimingSupport.isAvailable(timing.query[prev]);
                let disjoint = mTimingSupport.isDisjoint();
                if (available && !disjoint) {
                    let elapsed = mTimingSupport.getResult(timing.query[prev]);
                    timing.accumTime += elapsed * 1e-6;
                    timing.accumSamples++;
                }
            }
        }
        return result;
    };

    // In order to have the HUD show up in full-screen mode we'll create a container for it and the canvas,
    // and instead of requesting full-screen mode just for the canvas, we'll request it for the container instead

    /* add CSS rule for fullscreen canvas parent */
    const FS_STYLE = ".playerCanvas { width:100%; height:100%; border-radius:0; }";
    let fullScreenStyle = document.createElement("style");
    fullScreenStyle.type = "text/css";
    fullScreenStyle.innerHTML = `:fullscreen ${FS_STYLE} :full-screen ${FS_STYLE} :-webkit-full-screen ${FS_STYLE} :-moz-full-screen ${FS_STYLE} :-ms-fullscreen ${FS_STYLE}`;
    document.getElementsByTagName("head")[0].appendChild(fullScreenStyle);

    /* create container for HUD and canvas */
    let container = document.createElement("div");
    container.id = "perf-canvas-container";
    container.style = "width:100%; height:100%; top:0px; left:0px;";
    canvas.parentNode.appendChild(container);
    canvas.parentNode.removeChild(canvas);
    container.appendChild(canvas);

    /* override full-screen mode requests */
    let oldRequestFullScreen = piRequestFullScreen;
    piRequestFullScreen = function(ele) {
        if (ele === canvas)
            ele = ele.parentNode;
        return oldRequestFullScreen(ele);
    };

    /* create HUD canvas */
    let perfCanvas = document.createElement("canvas");
    perfCanvas.id = "perf-canvas";
    perfCanvas.width = HUD_WIDTH;
    perfCanvas.height = 192;
    perfCanvas.style = `display:none; position:absolute; width:${perfCanvas.width}px; height:${perfCanvas.height}px; top:8px; left:8px; pointer-events:none;`;
    canvas.parentNode.appendChild(perfCanvas);

    /* ...and drawing context */
    let perfCtx = perfCanvas.getContext("2d");
    perfCtx.font = FONT;
    perfCtx.textBaseline = "middle";
    perfCtx.shadowBlur = 1;
    perfCtx.shadowOffsetX = 1;
    perfCtx.shadowOffsetY = 1;

    /* redraw HUD (and reset pass timings) */
    function refreshHUD() {
        if (!gShaderToy || !gShaderToy.mEffect || gShaderToy.mIsPaused || perfCanvas.style.display == "none")
            return;

        let numPasses = 0,
            maxPassTime = 0,
            minPassTime = Number.MAX_VALUE

        for (let pass of gShaderToy.mEffect.mPasses) {
            let timing = pass.mTiming;
            if (!timing)
                continue;
            if (timing.accumSamples) {
                timing.average = timing.accumTime / timing.accumSamples;
                timing.accumTime = 0;
                timing.accumSamples = 0;
            }
            if (timing.average === undefined)
                continue;
            maxPassTime = Math.max(maxPassTime, timing.average);
            minPassTime = Math.min(minPassTime, timing.average);
            ++numPasses;
        }
        if (!numPasses)
            return;

        perfCtx.clearRect(0, 0, perfCanvas.width, perfCanvas.height);
        perfCtx.fillStyle = "#000a";
        perfCtx.shadowColor = "#0000";
        perfCtx.fillRect(0, 0, perfCanvas.width, numPasses * LINE_HEIGHT + MARGIN_Y * 2);
        perfCtx.shadowColor = "#0008";

        function mix(a, b, f) {
            f *= f * (3.0 - 2.0 * f);
            return a + (b - a) * f;
        }

        function getColor(time) {
            let fraction = (time - minPassTime) / (maxPassTime - minPassTime);
            if (minPassTime >= maxPassTime)
                fraction = 0;
            let fracHi = 2.0 * Math.max(fraction - 0.5, 0);
            let fracLo = 2.0 * Math.min(fraction, 0.5);
            let r = Math.round(mix(mix(LO_COLOR[0], MED_COLOR[0], fracLo), HI_COLOR[0], fracHi));
            let g = Math.round(mix(mix(LO_COLOR[1], MED_COLOR[1], fracLo), HI_COLOR[1], fracHi));
            let b = Math.round(mix(mix(LO_COLOR[2], MED_COLOR[2], fracLo), HI_COLOR[2], fracHi));
            return `rgb(${r},${g},${b})`;
        }

        let index = 0;
        for (let pass of gShaderToy.mEffect.mPasses) {
            let timing = pass.mTiming;
            if (!timing || timing.average === undefined)
                continue;
            let y = MARGIN_Y + (index + 0.5) * LINE_HEIGHT;
            perfCtx.fillStyle = getColor(timing.average);
            perfCtx.textAlign = "left";
            perfCtx.fillText(pass.mName, MARGIN_X, y);
            perfCtx.textAlign = "right";
            perfCtx.fillText(`${(timing.average).toFixed(2)}ms`, perfCanvas.width - MARGIN_X, y);
            ++index;
        }
    }

    /* add toggle UI (invisible div on top of framerate display) */
    let myFrameRate = document.getElementById("myFramerate");
    if (myFrameRate) {
        let toggle = document.createElement("div");
        toggle.id = "toggle-timing";
        toggle.style = `position:absolute; cursor:pointer; left:${myFrameRate.style.left}; top:0px; width:68px; height:100%;`;
        toggle.title = "Toggle pass timing info";
        myFrameRate.parentNode.appendChild(toggle);

        let timer = undefined;
        toggle.addEventListener("click", function(ev) {
            if (perfCanvas.style.display == "none") {
                perfCanvas.style.display = "initial";
                refreshHUD();
                timer = window.setInterval(refreshHUD, 1000);
            } else {
                perfCanvas.style.display = "none";
                if (timer)
                    window.clearInterval(timer);
                timer = undefined;
            }
        });
    } else {
        /* framerate display not found, fall back to always on */
        perfCanvas.style.display = "initial";
        window.setInterval(refreshHUD, 1000);
    }
})();
