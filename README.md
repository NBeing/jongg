# Jongg (J's WebGL abstraction with Pong)

Hello, this is essentially a custom WebGL 2d game engine. The game of Pong was used as a goal point for its simplicity of implementation.

The WebGL has some basic abstractions for:
- Rendering Triangles
- Rendering Textures
- Parsing Shaders
- Parsing and Setting Uniforms and Attributes

It also includes:
 - Loading Audio
 - Controller Support for a Custom Controller made with an Arduino.
     - A websocket backend parses the inputs from a rotary encoder which communicates via Serial.

The engine was a project used to better understand the WebGL API, and an attempt at abstracting it meaningfully. It is also my first foray into creating a game. It is by no means "production" ready nor readable, but I have understood a lot more about WebGL through this project, as well as some of the basic elements of creating a game. 

In the future I will likely use TWGL (tiny WebGL library)!

