#version 300 es
  
precision highp float;
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord; 
uniform vec2 u_resolution;

out vec2 v_texCoord;
out vec2 v_position;
// all shaders have a main function
void main() {
    // convert the position from pixels to 0.0 to 1.0
    vec2 zeroToOne = a_position / u_resolution;
 
    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;
 
    // convert from 0->2 to -1->+1 (clip space)
    vec2 clipSpace = zeroToTwo - 1.0;

    v_position = zeroToOne;
    gl_Position = vec4(a_position, 0.0,1.0);
    v_texCoord = a_texCoord;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    // gl_Position = vec4(a_position, 0.0, 1.0);

}