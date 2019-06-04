// ==UserScript==
// @name         Shadertoy FPS mode
// @namespace    http://tampermonkey.net/
// @version      0.5.20190605
// @description  Less restrictive mouse input with new, switchable FPS mode
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* global gShaderToy, gThemeName, watchInit:true */

(function() {
    'use strict';

    const icon_header = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAW";
    const icon_on = [
        icon_header + "CAYAAADEtGw7AAAAL0lEQVQ4y2NgGAVkgP9QTBRgopUrRg0ewoARS5LCpeY/Dj5W80bDeDRLj2bpYQUAWiwHECGpwrgAAAAASUVORK5CYII=)",
        icon_header + "CAYAAADEtGw7AAAAO0lEQVQ4y2NgGAWkgg0bNvzfsGHDf2LVM9HKIaMGD2HAiJ6k0BUEBAQwIsuh87GpHQ3j0Sw9mqWHHQAAtNMYULFAdhIAAAAASUVORK5CYII=)"
    ];
    const icon_off = [
        icon_header + "CAYAAADEtGw7AAAAaklEQVQ4y+2UQQrAIAwEt32G/7/mD34ofmF7SS9SjAZLKWTAg8YdMEKA5EsKAAGgAGhntL1YPYSYiJ34XhIVqyPWUfgY1Phwl7P583c/v9KKpfxrrUjxlLg52RYVV0dco6/phxB3DaFkDxerBCFgDNeTOAAAAABJRU5ErkJggg==)",
        icon_header + "BAMAAAA2mnEIAAAAD1BMVEUAAACxsbGvr6+wsLCwsLBbYh4HAAAABHRSTlMAGq3tZzAcXQAAADVJREFUGNNjYCAdCJmwGAkAaSYQWwCEIGwBKEZnYwOMQOwCxH8OoKohlv0BitHZ7z6AEOkAAMlDCqSp7BzsAAAAAElFTkSuQmCC)"
    ];

    var playerBar = document.getElementById("playerBar");
    var lockStatus = false;
    if (playerBar) {
        var lockStatusDiv = document.createElement("div");
        lockStatusDiv.className = "uiButton";
        lockStatusDiv.style = "width:22px;height:22px;top:1px;right:164px;position:absolute;";
        var updateStatus = function() {
            var theme = (gThemeName == "dark") ? 1 : 0;
            if (lockStatus) {
                lockStatusDiv.title = "Disable FPS mode";
                lockStatusDiv.style.background = icon_off[theme];
            } else {
                lockStatusDiv.title = "Enable FPS mode";
                lockStatusDiv.style.background = icon_on[theme];
            }
            if (gShaderToy && gShaderToy.mCanvas) {
                gShaderToy.mCanvas.focus();
            }
        };
        updateStatus();
        lockStatusDiv.onclick = function(ev) {
            lockStatus = !lockStatus;
            updateStatus();
        };
        playerBar.appendChild(lockStatusDiv);
    }

    var oldWatchInit = watchInit;
    watchInit = function() {
        oldWatchInit();

        var canvas = gShaderToy.mCanvas;
        var oldOnMouseDown = canvas.onmousedown;
        var oldOnMouseUp = canvas.onmouseup;
        var oldOnMouseMove = canvas.onmousemove;
        var mCurrentX = 0, mCurrentY = 0;

        document.addEventListener("pointerlockchange", function() {
            if (document.pointerLockElement !== canvas) {
                var ev = {
                    clientX : mCurrentX,
                    clientY : mCurrentY
                };
                oldOnMouseUp(ev);
            }
        }, false);

        canvas.onmousedown = function(ev) {
            if (document.pointerLockElement === canvas) {
                return;
            }
            mCurrentX = ev.clientX;
            mCurrentY = ev.clientY;
            if (lockStatus) {
                canvas.requestPointerLock();
            }
            oldOnMouseDown(ev);
        }

        canvas.onmouseup = function(ev) {
            if (document.pointerLockElement !== canvas) {
                oldOnMouseUp(ev);
            }
        }

        canvas.onmousemove = function(ev) {
            if (document.pointerLockElement === canvas) {
                mCurrentX += ev.movementX;
                mCurrentY += ev.movementY;
                ev = {
                    clientX : mCurrentX,
                    clientY : mCurrentY
                };
            }
            oldOnMouseMove(ev);
        }
    }
})();
