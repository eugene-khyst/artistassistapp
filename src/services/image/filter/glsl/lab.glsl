// CIE 15:2018 (ISO/CIE 11664-4), with the exact rational constants.
const float CIE_EPSILON = 216.0 / 24389.0;
const float CIE_KAPPA = 24389.0 / 27.0;

vec3 xyzToLab(vec3 xyz) {
  vec3 t = xyz / D65_XYZ;
  vec3 f = mix((CIE_KAPPA * t + 16.0) / 116.0, cbrt(t), greaterThan(t, vec3(CIE_EPSILON)));
  return vec3(116.0 * f.y - 16.0, 500.0 * (f.x - f.y), 200.0 * (f.y - f.z));
}

vec3 labToXyz(vec3 lab) {
  float fy = (lab.x + 16.0) / 116.0;
  vec3 f = vec3(lab.y / 500.0 + fy, fy, fy - lab.z / 200.0);
  vec3 cube = f * f * f;
  vec3 t = mix((116.0 * f - 16.0) / CIE_KAPPA, cube, greaterThan(cube, vec3(CIE_EPSILON)));
  // Y comes from L directly, which avoids the cancellation in 116 * fy - 16.
  t.y = lab.x > CIE_KAPPA * CIE_EPSILON ? cube.y : lab.x / CIE_KAPPA;
  return t * D65_XYZ;
}

vec3 rgbToLab(vec3 rgb) {
  return xyzToLab(rgbToXyz(rgb));
}

vec3 labToRgb(vec3 lab) {
  return xyzToRgb(labToXyz(lab));
}
