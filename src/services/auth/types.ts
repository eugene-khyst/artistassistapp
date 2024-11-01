/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name?: string;
}

export class AuthError extends Error {
  constructor(
    public type: string,
    message?: string
  ) {
    super(message);
    this.type = type;
  }
}
