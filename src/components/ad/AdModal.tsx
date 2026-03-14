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

import {Ad} from '~/src/components/ad/Ad';
import {useAds} from '~/src/hooks/useAds';
import {useCountdown} from '~/src/hooks/useCountdown';
import {useDelayedInterval} from '~/src/hooks/useDelayedInterval';
import type {AdDefinition} from '~/src/services/ads/types';
import {useAppStore} from '~/src/stores/app-store';

const PLACEMENT = 'popup';
const DEFAULT_PLACEMENT = 'all';
const CLOSE_SECONDS = 5;
const AD_POPUP_INITIAL_DELAY = 1 * 60000;
const AD_POPUP_INTERVAL = 15 * 60000;

export const AdModal: React.FC = () => {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  const {ads: {ads: allAds, placements} = {ads: {}, placements: {}}} = useAds();

  const [open, setOpen] = useDelayedInterval(AD_POPUP_INITIAL_DELAY, AD_POPUP_INTERVAL);

  const closeCounter = useCountdown(open, CLOSE_SECONDS);

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
