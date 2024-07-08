/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Button, Card, Flex, Grid, Skeleton, theme} from 'antd';
import {useEffect, useState} from 'react';

import {apiUrl} from '~/src/config';
import {useAds} from '~/src/hooks';
import type {AdDefinition, AdsDefinition} from '~/src/services/ads';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/types';
import {randomInt} from '~/src/utils';

const AD_CHANGE_INTERVAL = 30 * 1000;

function getImageUrl({image}: AdDefinition, adsUrl: string): string {
  return new URL(image, adsUrl).toString();
}

type Props = {
  ads?: AdsDefinition;
  tab: TabKey;
};

export const Ad: React.FC<Props> = ({tab}: Props) => {
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {
    token: {colorFillSecondary},
  } = theme.useToken();
  const screens = Grid.useBreakpoint();

  const {ads: {ads, placements} = {ads: {}, placements: {}}, isLoading} = useAds();

  const [adIndex, setAdIndex] = useState(randomInt(0, 9));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setAdIndex((prev: number) => prev + 1);
    }, AD_CHANGE_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const adKeys: string[] = placements[tab] ?? [];
  const adKey: string | undefined = adKeys[adIndex % adKeys.length];
  const ad: AdDefinition | undefined = ads[adKey];
  if (!isLoading && !ad) {
    return <></>;
  }
  return (
    <Card
      hoverable
      style={{backgroundColor: colorFillSecondary}}
      styles={{body: {padding: 0, overflow: 'hidden'}}}
    >
      <Flex vertical={!screens['md']} align="center">
        {isLoading ? (
          <Skeleton.Image
            active
            style={{
              width: 200,
              height: 150,
              objectFit: 'contain',
            }}
          />
        ) : (
          <>
            <img
              src={getImageUrl(ad, apiUrl)}
              style={{
                display: 'block',
                width: 200,
                height: 150,
                objectFit: 'contain',
              }}
            />
          </>
        )}
        <Flex vertical align="flex-start" style={{padding: 16}}>
          {isLoading ? (
            <>
              <Skeleton active title={false} paragraph={{rows: 3}} />
              <Skeleton.Button active />
            </>
          ) : (
            <>
              <div style={{marginBottom: 16, textAlign: 'justify'}}>{ad.text}</div>
              {ad.linkUrl && (
                <Button type="primary" href={ad.linkUrl} target="_blank">
                  {ad.linkText}
                </Button>
              )}
              {ad.linkTab && Object.values(TabKey).includes(ad.linkTab as TabKey) && (
                <Button type="primary" onClick={() => void setActiveTabKey(ad.linkTab as TabKey)}>
                  {ad.linkText}
                </Button>
              )}
            </>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};
