/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {RightOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import {clsx} from 'clsx';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {useEffect, useEffectEvent, useRef, useState} from 'react';

import type {CssVariables} from '@/utils/types';

import styles from './LightboxOverlay.module.css';

interface LightboxOverlayProps {
  onUnlock: () => void;
}

const TRACK_WIDTH = 240;
const TRACK_PADDING = 4;
const KNOB_SIZE = 40;
const UNLOCK_THRESHOLD = 0.9;
const MAX_DX = TRACK_WIDTH - KNOB_SIZE - TRACK_PADDING * 2;

export function LightboxOverlay({onUnlock}: Readonly<LightboxOverlayProps>) {
  const {t} = useLingui();

  const [dx, setDx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const handleEscape = useEffectEvent(() => {
    onUnlock();
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleEscape();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) {
      return;
    }
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId || startXRef.current === null) {
      return;
    }
    const delta = event.clientX - startXRef.current;
    setDx(Math.max(0, Math.min(MAX_DX, delta)));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIdRef.current = null;
    startXRef.current = null;
    setIsDragging(false);
    if (dx >= MAX_DX * UNLOCK_THRESHOLD) {
      onUnlock();
    } else {
      setDx(0);
    }
  };

  const progress = dx / MAX_DX;
  const trackStyle: CssVariables = {
    '--lightbox-progress': `${Math.round(progress * 100)}%`,
    '--lightbox-label-opacity': Math.max(0, 1 - progress * 1.5),
    '--lightbox-knob-offset': `${dx}px`,
  };

  return (
    <div
      className={styles['overlay']}
      onContextMenu={event => {
        event.preventDefault();
      }}
    >
      <div className={styles['track']} style={trackStyle}>
        <div className={clsx(styles['fill'], isDragging && styles['fillDragging'])} />
        <div className={styles['label']}>{t`Swipe to unlock`}</div>
        <div
          role="button"
          tabIndex={0}
          aria-label={t`Swipe to unlock`}
          className={clsx(styles['knob'], isDragging && styles['knobDragging'])}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <RightOutlined />
        </div>
      </div>
    </div>
  );
}
