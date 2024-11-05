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

import {Card, theme} from 'antd';
import {useContext} from 'react';

import {Ad} from '~/src/components/ad/Ad';
import {TabContext} from '~/src/contexts/TabContext';
import {useAds} from '~/src/hooks';
import {useAuth} from '~/src/hooks/useAuth';
import type {AdDefinition} from '~/src/services/ads';
import type {TabKey} from '~/src/tabs';

const DEFAULT_PLACEMENT = 'all';

interface Props {
  vertical?: boolean;
}

export const AdCard: React.FC<Props> = ({vertical = false}: Props) => {
  const tab: TabKey = useContext(TabContext);

  const {isLoading: isAuthLoading, user} = useAuth();

  const {ads: {ads: allAds, placements} = {ads: {}, placements: {}}} = useAds();

  const {
    token: {colorFillSecondary},
  } = theme.useToken();

  const adKeys: string[] = placements[tab] ?? placements[DEFAULT_PLACEMENT] ?? [];
  const ads: AdDefinition[] = adKeys
    .map((adKey: string): AdDefinition | undefined => allAds[adKey])
    .filter((ad): ad is AdDefinition => !!ad);

  if (isAuthLoading || user || !ads.length) {
    return <></>;
  }
  return (
    <Card
      hoverable
      style={{backgroundColor: colorFillSecondary}}
      styles={{body: {padding: 0, overflow: 'hidden'}}}
    >
      <Ad vertical={vertical} ads={ads} />
    </Card>
  );
};
