/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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

type Props = {
  vertical?: boolean;
};

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
