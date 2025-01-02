#version 300 es

precision mediump float;

uniform sampler2D u_texture;
uniform vec3 u_invMaxValues;
uniform float u_saturation;
uniform float u_inputLow;
uniform float u_inputHigh;
uniform float u_gamma;
uniform float u_outputLow;
uniform float u_outputHigh;
uniform float u_scaleR;
uniform float u_scaleG;
uniform float u_scaleB;

in vec2 v_texcoord;
out vec4 fragColor;

#include linear-rgb.glsl;
#include luminance.glsl;

void main() {
  vec4 color = texture(u_texture, v_texcoord);
  vec3 linearRgb = srgbToLinear(color.rgb);
  linearRgb = clamp(linearRgb * u_invMaxValues, 0.0, 1.0);
  if (u_saturation != 1.0) {
    linearRgb = mix(linearRgb, vec3(getLuminance(linearRgb)), 1.0 - u_saturation);
  }
  if (u_inputLow != 0.0 || u_inputHigh != 1.0 || u_gamma != 1.0 || u_outputLow != 0.0 || u_outputHigh != 1.0) {
    for (int i = 0; i < 3; i++) {
      float value = (linearRgb[i] - u_inputLow) / (u_inputHigh - u_inputLow);
      value = clamp(value, 0.0, 1.0);
      value = pow(value, 1.0 / u_gamma);
      value = u_outputLow + value * (u_outputHigh - u_outputLow);
      linearRgb[i] = clamp(value, 0.0, 1.0);
    }
  }
  if (u_scaleR != 1.0 || u_scaleG != 1.0 || u_scaleB != 1.0) {
    linearRgb.r *= clamp(u_scaleR, 0.0, 1.0);
    linearRgb.g *= clamp(u_scaleG, 0.0, 1.0);
    linearRgb.b *= clamp(u_scaleB, 0.0, 1.0);
  }
  fragColor = vec4(linearToSrgb(linearRgb), color.a);
}