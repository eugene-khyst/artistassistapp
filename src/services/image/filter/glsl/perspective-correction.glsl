#version 300 es

precision mediump float;

uniform sampler2D u_texture;
uniform mat3 u_inverse_homography;
uniform vec2 u_src_dimensions;
uniform vec2 u_dest_dimensions;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 dest_coord = v_texCoord * u_dest_dimensions;
  vec3 src_pos_h = u_inverse_homography * vec3(dest_coord, 1.0);
  vec2 src_pos = src_pos_h.xy / src_pos_h.z;
  vec2 final_tex_coord = src_pos / u_src_dimensions;
  if (final_tex_coord.x >= 0.0 && final_tex_coord.x <= 1.0 && final_tex_coord.y >= 0.0 && final_tex_coord.y <= 1.0) {
    fragColor = texture(u_texture, final_tex_coord);
  } else {
    fragColor = vec4(0.0);
  }
}
