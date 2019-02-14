// ==UserScript==
// @name         Shadertoy comment preview
// @namespace    http://tampermonkey.net/
// @version      0.3.20190214
// @description  Preview comments before submitting them
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let myComments = document.getElementById("myComments"),
        commentTextArea = document.getElementById("commentTextArea"),
        postButton = document.getElementById("myCommentButton");

    if (!myComments || !commentTextArea || !postButton) {
        return;
    }

    myComments.style.tabSize = 4; // for Fabrice :)
    commentTextArea.style.resize = "vertical";
    commentTextArea.style.minHeight = "4em";
    commentTextArea.style.marginBottom = "12px";

    let previewArea = document.createElement("div");
    previewArea.style = "margin-top: 0px; margin-bottom: 12px; width: 100%; min-height: 3em; display: none;";
    previewArea.className = "commentSelf";
    previewArea.classList.add("commentContent");
    commentTextArea.parentElement.insertBefore(previewArea, commentTextArea);

    let previewButton = document.createElement("input");
    previewButton.id = "myPreviewButton";
    previewButton.type = "submit";
    previewButton.style = "display:inline-block;right:95px;position:absolute;";
    previewButton.className = 'formButton';
    postButton.parentElement.appendChild(previewButton);

    let editing = true;

    function updatePreview(set_focus) {
        if (editing) {
            previewButton.value = "Preview";
            commentTextArea.style.display = "";
            previewArea.style.display = "none";
            if (set_focus) {
                commentTextArea.focus();
            }
        } else {
            previewButton.value = "Edit";
            commentTextArea.style.display = "none";
            previewArea.style.display = "inline-block";
            previewArea.innerHTML = window.bbc2html(window.htmlEntities(commentTextArea.value),true);
            if (set_focus) {
                previewButton.focus();
            }
        }
    }

    let oldValidateComment = window.validateComment;
    window.validateComment = function(form) {
        let result = oldValidateComment(form);
        editing = true;
        updatePreview(true);
        return result;
    }

    previewButton.onclick = function() {
        editing = !editing || !window.checkFormComment(commentTextArea.value);
        updatePreview(true);
        return false;
    };

    updatePreview(false);
})();
