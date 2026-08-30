const float OKLRAB_K1 = 0.206;
const float OKLRAB_K2 = 0.03;
const float OKLRAB_K3 = (1.0 + OKLRAB_K1) / (1.0 + OKLRAB_K2);

float toe(float lightness) {
  float value = OKLRAB_K3 * lightness - OKLRAB_K1;
  return 0.5 * (value +
    sqrt(value * value + 4.0 * OKLRAB_K2 * OKLRAB_K3 * lightness));
}

vec3 oklabToOklrab(vec3 oklab) {
  return vec3(toe(oklab.x), 2.0 * oklab.yz);
}

float deltaEOKr2(vec3 first, vec3 second) {
  return distance(oklabToOklrab(first), oklabToOklrab(second));
}