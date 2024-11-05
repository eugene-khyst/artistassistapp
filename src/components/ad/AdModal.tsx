/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {CloseOutlined} from '@ant-design/icons';
import {Button, Modal} from 'antd';
import {type Dispatch, type SetStateAction, useEffect, useState} from 'react';

import {Ad} from '~/src/components/ad/Ad';
import {useAds} from '~/src/hooks';
import {useAuth} from '~/src/hooks/useAuth';
import type {AdDefinition} from '~/src/services/ads';

const PLACEMENT = 'popup';
const DEFAULT_PLACEMENT = 'all';
const CLOSE_SECONDS = 5;

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export const AdModal: React.FC<Props> = ({open, setOpen}: Props) => {
  const {isLoading: isAuthLoading, user} = useAuth();

  const {ads: {ads: allAds, placements} = {ads: {}, placements: {}}} = useAds();

  const [closeCounter, setCloseCounter] = useState<number>(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCloseCounter(CLOSE_SECONDS);
    const intervalId = setInterval(() => {
      setCloseCounter(prev => {
        const next = prev - 1;
        if (next === 0) {
          clearInterval(intervalId);
        }
        return next;
      });
    }, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [open]);

  const adKeys: string[] = placements[PLACEMENT] ?? placements[DEFAULT_PLACEMENT] ?? [];
  const ads: AdDefinition[] = adKeys
    .map((adKey: string): AdDefinition | undefined => allAds[adKey])
    .filter((ad): ad is AdDefinition => !!ad);

  if (isAuthLoading || user || !ads.length) {
    return <></>;
  }
  return (
    <Modal centered open={open} footer={null} closeIcon={null}>
      <Ad
        vertical
        ads={ads}
        footer={
          closeCounter > 0 ? (
            <Button loading>Close ad in {closeCounter} s</Button>
          ) : (
            <Button
              icon={<CloseOutlined />}
              onClick={() => {
                setOpen(false);
              }}
            >
              Close ad
            </Button>
          )
        }
        style={{paddingBottom: 0}}
      />
    </Modal>
  );
};
