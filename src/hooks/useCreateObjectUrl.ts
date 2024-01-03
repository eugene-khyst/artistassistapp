/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';

export function useCreateObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl: string = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}
