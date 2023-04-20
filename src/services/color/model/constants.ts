/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export const CIE_E: number = 216 / 24389;
export const CIE_K: number = 24389 / 27;

export const ILLUMINANT_D65 = {x: 0.95047, y: 1.0, z: 1.08883};

export const WAVELENGTH_RANGE: number[] = [...Array(36).keys()].map((v: number) => 380 + 10 * v);
