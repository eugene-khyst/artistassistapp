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
import type {PointerEvent as ReactPointerEvent} from 'react';
import {useEffect, useRef, useState} from 'react';

interface LightboxOverlayProps {
  onUnlock: () => void;
}

const TRACK_WIDTH = 240;
const TRACK_PADDING = 4;
const KNOB_SIZE = 40;
const UNLOCK_THRESHOLD = 0.9;
const MAX_DX = TRACK_WIDTH - KNOB_SIZE - TRACK_PADDING * 2;

export const LightboxOverlay: React.FC<LightboxOverlayProps> = ({onUnlock}) => {
  const {t} = useLingui();

  const [dx, setDx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onUnlock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUnlock]);

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

  return (
    <div
      className="lightbox-overlay"
      onContextMenu={event => {
        event.preventDefault();
      }}
    >
      <div className="lightbox-track">
        <div
          className={isDragging ? 'lightbox-fill lightbox-fill--dragging' : 'lightbox-fill'}
          style={{width: `${Math.round(progress * 100)}%`}}
        />
        <div
          className="lightbox-label"
          style={{opacity: Math.max(0, 1 - progress * 1.5)}}
        >{t`Swipe to unlock`}</div>
        <div
          role="button"
          tabIndex={0}
          aria-label={t`Swipe to unlock`}
          className={isDragging ? 'lightbox-knob lightbox-knob--dragging' : 'lightbox-knob'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{transform: `translateX(${dx}px)`}}
        >
          <RightOutlined />
        </div>
      </div>
    </div>
  );
};
