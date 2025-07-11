/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {Trans} from '@lingui/react/macro';
import {Button, Modal} from 'antd';
import {useEffect, useState} from 'react';

import {Ad} from '~/src/components/ad/Ad';
import {useAds} from '~/src/hooks/useAds';
import type {AdDefinition} from '~/src/services/ads/types';
import {useAppStore} from '~/src/stores/app-store';

const PLACEMENT = 'popup';
const DEFAULT_PLACEMENT = 'all';
const CLOSE_SECONDS = 5;

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const AdModal: React.FC<Props> = ({open, setOpen}: Props) => {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  const {ads: {ads: allAds, placements} = {ads: {}, placements: {}}} = useAds();

  const [closeCounter, setCloseCounter] = useState<number>(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCloseCounter(CLOSE_SECONDS);
    const intervalId = setInterval(() => {
      setCloseCounter(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
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
            <Button loading>
              <Trans>Close in {closeCounter} sec</Trans>
            </Button>
          ) : (
            <Button
              icon={<CloseOutlined />}
              onClick={() => {
                setOpen(false);
              }}
            >
              <Trans>Close</Trans>
            </Button>
          )
        }
        style={{paddingBottom: 0}}
      />
    </Modal>
  );
};
