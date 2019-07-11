// ==UserScript==
// @name         Shadertoy FPS limit
// @namespace    http://tampermonkey.net/
// @version      0.3.20190711
// @description  Configurable framerate limit
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* global localStorage, Effect, watchResize:true */
/* eslint curly: 0, no-multi-spaces: 0 */

(function() {
    'use strict';

    const PREDEFINED_LIMITS = [30, 48, 60, 72, 90, 100, 120, 144];
    const USE_PREDEFINED_LIMITS = false;
    const FPS_LIMIT_KEY = "ext-fps-limit",
          USE_FPS_LIMIT_KEY = "ext-use-fps-limit";

    function saveOption(key, value) {
        if (!localStorage)
            return false;
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            return false;
        }
        return true;
    }

    function loadOption(key) {
        return localStorage && localStorage.getItem(key);
    }

    let useLimit = loadOption(USE_FPS_LIMIT_KEY) === "true",
        targetFPS = loadOption(FPS_LIMIT_KEY) || 30,
        playerBar = document.getElementById("playerBar");

    if (playerBar) {
        let toggleLimit = document.createElement("a");
        toggleLimit.classList.add("playerBarText");
        toggleLimit.classList.add("regular");
        toggleLimit.style = "cursor:pointer;position:absolute;left:240px;top:2px;bottom:2px;width:21px;text-align:center;";
        toggleLimit.id = "myCustomFPSLimitToggle";
        playerBar.appendChild(toggleLimit);

        let limitInput = document.createElement("input");
        const INPUT_WIDTH = USE_PREDEFINED_LIMITS ? 68 : 48;
        limitInput.type = "number";
        limitInput.classList.add("inputForm");
        limitInput.style = "position:absolute;left:264px;top:2px;bottom:2px;width:0px;visibility:hidden;padding-left:2px;padding-right:initial;transition:width 0.125s;";
        limitInput.placeholder = "Limit";
        limitInput.min = 1;
        limitInput.value = targetFPS;
        playerBar.appendChild(limitInput);

        if (USE_PREDEFINED_LIMITS) {
            let limitValues = document.createElement("datalist");
            limitValues.id = "myFPSLimitValues";
            for (let limit of PREDEFINED_LIMITS) {
                let option = document.createElement("option");
                option.value = limit;
                limitValues.appendChild(option);
            }
            playerBar.appendChild(limitValues);
            limitInput.setAttribute("list", limitValues.id);
        }

        limitInput.onchange = function(ev) {
            targetFPS = ev.target.value;
            saveOption(FPS_LIMIT_KEY, targetFPS);
        };

        let canvas = document.getElementById("demogl");
        let myResolution = document.getElementById("myResolution");
        if (myResolution && canvas) {
            myResolution.style.left = "330px";
            let oldWatchResize = watchResize;
            watchResize = function() {
                let result = oldWatchResize();
                if (canvas.offsetWidth < 600)
                    myResolution.style.visibility = "hidden";
                else
                    myResolution.style.visibility = "visible";
                return result;
            };
        }

        function updateStatus() {
            if (useLimit) {
                toggleLimit.text = "\u2243";
                toggleLimit.title = "Click to disable FPS limit";
                limitInput.style.width = INPUT_WIDTH + "px";
                limitInput.style.visibility = "visible";
            } else {
                toggleLimit.text = "\u221e";
                toggleLimit.title = "Click to enable FPS limit (" + targetFPS + ")";
                limitInput.style.width = "0px";
                window.setTimeout(function() {
                    if (!useLimit) {
                        limitInput.style.visibility = "hidden";
                    }
                }, 100);
            }
            if (canvas) {
                canvas.focus();
            }
        }

        updateStatus();
        toggleLimit.onclick = function(ev) {
            useLimit = !useLimit;
            saveOption(USE_FPS_LIMIT_KEY, useLimit);
            updateStatus();
        };
    }

    let nextTime = performance.now();
    let oldRAF = Effect.prototype.RequestAnimationFrame;
    Effect.prototype.RequestAnimationFrame = function(id) {
        let effect = this;
        function throttle(timestamp) {
            if (!useLimit) {
                id(timestamp);
                nextTime = timestamp;
                return;
            }
            let targetMsec = 1000 / Math.max(targetFPS, 1);
            let delta = timestamp - nextTime;
            if (delta < -0.5 * targetMsec) {
                oldRAF.call(effect, throttle);
                return;
            }
            if (delta <= 0) {
                nextTime += targetMsec;
            } else {
                nextTime = timestamp + targetMsec - delta % targetMsec;
            }
            id(timestamp);
        }
        oldRAF.call(this, throttle);
    };
})();
