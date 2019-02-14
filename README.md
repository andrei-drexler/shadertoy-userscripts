## Getting started
If you're not familiar with userscripts, you can think of them as mini browser extensions. In order to use them you need to install a so-called *userscript manager* (an actual browser extension), like [Tampermonkey](https://tampermonkey.net/). Once that's taken care of, you can install any of these scripts by clicking on the *Raw* view - Tampermonkey should detect the .user.js suffix and present a confirmation screen.

## What's in the box?

| File name | Description |
|:---|:---|
|[shadertoy_comment_preview.user.js](./shadertoy_comment_preview.user.js)|Adds comment preview functionality, so that you can check your BBCode for errors before posting. Also makes the comment input area resizable, in case you have a lot on your mind. Bonus: sets tab size to 4 (matching the editor), so that code pasted in comments aligns nicely.|
|[shadertoy_fps_mode.user.js](./shadertoy_fps_mode.user.js)|Adds a switchable FPS (as in first-person-shooter) mode. When enabled, you only have to click once on the canvas and then you can move the mouse freely, without the need to keep the mouse button pressed, or worry about going out of bounds. Meant primarily for FPS-like shaders, such as [Quake](https://www.shadertoy.com/view/lsKfWd) or [DOOM](https://www.shadertoy.com/view/lldGDr), but it works nicely with pretty much any shader where you use the mouse to look around or scroll.|
|[shadertoy_video_settings.user.js](./shadertoy_video_settings.user.js)|Adds an explicit (high) bitrate, limits the recording framerate to 60 fps (shader still running at full speed), changes the codec to H264 if available (for better compatibility with video editing/playback software), generates a more descriptive output file name (e.g. Quake_Introduction-20190130-1948.webm), and also resumes the shader (if paused) when you begin recording and pauses it when you're done.|
