// ==UserScript==
// @name         Shadertoy error navigation
// @namespace    http://tampermonkey.net/
// @version      0.2.20190717
// @description  Go to first/prev/next error
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* global ShaderToy:true, gShaderToy */
/* eslint curly: 0, no-multi-spaces: 0 */

(function() {
    'use strict';

    let toolBar = document.getElementById("toolBar"),
        compilationTime = document.getElementById("compilationTime");
    if (!toolBar || !compilationTime) {
        return;
    }

    /* helper: search array in ascending/descending order, depending on direction */
    function find(arr, dir, pred) {
        if (dir >= 0)
            return arr.findIndex(pred);
        for (let i=arr.length-1; i>=0; --i)
            if (pred(arr[i]))
                return i;
        return -1;
    }

    /* error nav functions */
    function goToError(index) {
        if (!gShaderToy.mErrors.length)
            return;
        let cm = gShaderToy.mCodeEditor;
        let lineNo = cm.getLineNumber(gShaderToy.mErrors[index].line);
        let pos = cm.charCoords({line: lineNo, ch: 0}, "local").top;
        let middleHeight = cm.getScrollerElement().offsetHeight / 2;
        cm.setCursor({line: lineNo, ch: 0});
        cm.scrollTo(null, pos - middleHeight - 5);
        cm.focus();
    }

    function goToNext(dir) {
        let cm = gShaderToy.mCodeEditor,
            cursor = cm.getCursor(),
            errors = gShaderToy.mErrors,
            index = find(errors, dir, err => cm.getLineNumber(err.line) * dir > cursor.line * dir);
        if (index == -1)
            index = (dir >= 0) ? 0 : errors.length - 1;
        goToError(index);
    }

    /* create UI elements */
    let errorContainer = document.createElement("div");
    errorContainer.id = "ext-error-info"
    errorContainer.style = "position:absolute; width:180px; height:auto; left:64px; top:4px; visibility:hidden;";
    toolBar.appendChild(errorContainer);

    let prevError = document.createElement("a");
    prevError.id = "ext-prev-error";
    prevError.text = "\u25C0";
    prevError.classList.add("regular");
    prevError.style.cursor = "pointer";
    prevError.style.paddingRight = "8px";
    prevError.title = "Go to previous error (Shift-F8)";
    errorContainer.appendChild(prevError);

    let errorInfo = document.createElement("a");
    errorInfo.id = "ext-error-count";
    errorInfo.classList.add("regular");
    errorInfo.style.cursor = "pointer";
    errorInfo.title = "Go to first error";
    errorContainer.appendChild(errorInfo);

    let nextError = document.createElement("a");
    nextError.id = "ext-next-error";
    nextError.text = "\u25B6";
    nextError.classList.add("regular");
    nextError.style.cursor = "pointer";
    nextError.style.paddingLeft = "8px";
    nextError.title = "Go to next error (F8)";
    errorContainer.appendChild(nextError);

    prevError.addEventListener("click", function() { goToNext(-1); });
    nextError.addEventListener("click", function() { goToNext(1); });
    errorInfo.addEventListener("click", function() { goToError(0); });

    /* override error update to hide compilation time/show error info when needed */
    let oldSetErrors = ShaderToy.prototype.SetErrors;
    ShaderToy.prototype.SetErrors = function(...args) {
        let result = oldSetErrors.apply(this, args);
        let errors = gShaderToy && gShaderToy.mErrors;
        if (errors && errors.length) {
            this.mCompilerTime.style.visibility = "hidden";
            if (errors.length == 1) {
                errorInfo.text = `1 error`;
                prevError.style.display = "none";
                nextError.style.display = "none";
            } else {
                errorInfo.text = `${errors.length} errors`;
                prevError.style.display = "unset";
                nextError.style.display = "unset";
            }
            errorContainer.style.visibility = "visible";
        } else {
            this.mCompilerTime.style.visibility = "visible";
            errorContainer.style.visibility = "hidden";
        }
        return result;
    };

    /* override recompilation to restore status visibility */
    let oldSetShaderFromEditor = ShaderToy.prototype.SetShaderFromEditor;
    ShaderToy.prototype.SetShaderFromEditor = function(...args) {
        this.mCompilerTime.style.visibility = "visible";
        errorContainer.style.visibility = "hidden";
        return oldSetShaderFromEditor.apply(this, args);
    };

    /* override ShaderToy initialization to add prev error/next error editor keys */
    let oldShaderToy = ShaderToy,
        oldShaderToyProto = ShaderToy.prototype;
    ShaderToy = function(parentElement, editorParent, passParent) {
        let result = new oldShaderToy(parentElement, editorParent, passParent);
        if (result && result.mCodeEditor) {
            result.mCodeEditor.addKeyMap({
                "Shift-F8": function() { goToNext(-1); },
                "F8": function() { goToNext(1); }
            });
        }
        return result;
    };
    ShaderToy.prototype = oldShaderToyProto;

    /* bonus: focus editor when changing tabs */
    let oldChangePass = ShaderToy.prototype.ChangePass;
    ShaderToy.prototype.ChangePass = function(id) {
        let result = oldChangePass.call(this, id);
        gShaderToy.mCodeEditor.focus();
        return result;
    };
})();
