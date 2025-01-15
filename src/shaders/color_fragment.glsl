#version 300 es
  
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
uniform sampler2D diffuseTexture;
in vec2 v_texCoord;
// in vec2 v_position;
// we need to declare an output for the fragment shader
out vec4 fragColor;
  
void main() {
  
  // Just set the output to a constant reddish-purple
  // fragColor = vec4(v_position.x, v_position.y, 0.5, 1);
  // fragColor = texture(diffuseTexture, v_texCoord);
  fragColor = vec4(1.0f, 1.0f, 1.0f, 1.0f);

}