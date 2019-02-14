// ==UserScript==
// @name         Shadertoy video settings
// @namespace    http://tampermonkey.net/
// @version      0.2.20190129
// @description  Shadertoy video capture tweaks (override codec, bitrate, FPS and file name; play on start, pause on end)
// @author       Andrei Drexler
// @match        https://www.shadertoy.com/view/*
// @match        https://www.shadertoy.com/new
// @run-at       document-end
// @grant        none
// ==/UserScript==

/* global gShaderToy */

(function() {
    'use strict';

    const knownCodecs = [
        {extension: ".mp4",  mimeType: "video/mp4;codecs=avc1"},
        {extension: ".mp4",  mimeType: "video/mp4;codecs=h264"},
        {extension: ".webm", mimeType: "video/webm;codecs=avc1"},
        {extension: ".webm", mimeType: "video/webm;codecs=h264"},
        {extension: ".webm", mimeType: "video/webm;codecs=vp9"},
        {extension: ".mkv",  mimeType: "video/x-matroska;codecs=avc1"},
        {extension: ".mkv",  mimeType: "video/x-matroska;codecs=h264"},
        {extension: ".webm", mimeType: "video/webm"}
    ];
    var preferredCodec;
    for (let codec of knownCodecs) {
        if (MediaRecorder.isTypeSupported(codec.mimeType)) {
            preferredCodec = codec;
            break;
        }
    }

    var oldMediaRecorder = window.MediaRecorder;
    window.MediaRecorder = function(stream, options) {
        if (!options) {
            options = {};
        }
        if (preferredCodec)
            options.mimeType = preferredCodec.mimeType;
        options.videoBitsPerSecond = 24e+6;
        return new oldMediaRecorder(stream, options);
    };

    var canvas = document.getElementById("demogl");
    if (canvas) {
        let oldCaptureStream = canvas.captureStream;
        canvas.captureStream = function(fps) {
            return oldCaptureStream.call(canvas, fps || 60);
        };
    }

    function getTimestamp() {
        let date = new Date();
        date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset());
        return date.toJSON().substr(0, 16).replace(/[\-\:]/g, '').replace('T', '-');
    }

    function sanitize(name) {
        return name.replace(/[^a-z0-9\-]/gi, '_').replace(/_{2,}/g, '_').replace(/(?:^_)|(?:_$)/g, '');
    }

    function getFileName() {
        let extension = preferredCodec ? preferredCodec.extension : ".webm";
        return (sanitize(gShaderToy.mInfo.name)||"shadertoy") + "-" + getTimestamp() + extension;
    }

    piCreateMediaRecorder = function(isRecordingCallback, canvas) {
        if (piCanMediaRecorded(canvas) == false) {
            return null;
        }

        var mediaRecorder = new MediaRecorder(canvas.captureStream());
        var chunks = [];

        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstart = function() {
            if (gShaderToy.mIsPaused)
                gShaderToy.pauseTime(true);
            isRecordingCallback(true);
        };

        mediaRecorder.onstop = function() {
            isRecordingCallback(false);
            let blob     = new Blob(chunks);
            chunks       = [];
            let videoURL = window.URL.createObjectURL(blob);
            let a        = document.createElement("a");
            document.body.appendChild(a);
            a.style      = "display: none";
            a.href       = videoURL;
            a.download   = getFileName();
            a.click();
            window.URL.revokeObjectURL(videoURL);
            if (!gShaderToy.mIsPaused)
                gShaderToy.pauseTime(true);
        };

        return mediaRecorder;
    };
})();
