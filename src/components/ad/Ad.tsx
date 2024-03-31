/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Button, Card, Flex, Grid, Skeleton, theme} from 'antd';
import {useContext} from 'react';
import {TabKey} from '~/src/components/types';
import {AppConfig, AppConfigContext} from '~/src/context/AppConfigContext';
import {AdDefinition, AdsDefinition} from '~/src/services/ads';

function getImageUrl({image}: AdDefinition, adsUrl: string): string {
  return new URL(image, adsUrl).toString();
}

type Props = {
  ads?: AdsDefinition;
  tab: TabKey;
  index?: number;
};

export const Ad: React.FC<Props> = ({
  ads: {ads, placements} = {ads: {}, placements: {}},
  tab,
  index = 0,
}: Props) => {
  const {
    token: {colorFillSecondary},
  } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const {adsUrl} = useContext<AppConfig>(AppConfigContext);
  const adId: string | undefined = placements?.[tab]?.[index];
  const ad: AdDefinition | undefined = ads?.[adId];
  return (
    <Card
      hoverable
      style={{backgroundColor: colorFillSecondary}}
      styles={{body: {padding: 0, overflow: 'hidden'}}}
    >
      <Flex vertical={!screens['md']} align="center">
        {ad ? (
          <>
            <img
              src={getImageUrl(ad, adsUrl)}
              style={{
                display: 'block',
                width: 200,
                height: 150,
                objectFit: 'contain',
              }}
            />
          </>
        ) : (
          <Skeleton.Image
            active
            style={{
              width: 200,
              height: 150,
              objectFit: 'contain',
            }}
          />
        )}
        <Flex vertical align="flex-start" style={{padding: 16}}>
          {ad ? (
            <>
              <div style={{marginBottom: 16, textAlign: 'justify'}}>{ad.text}</div>
              <Button type="primary" href={ad.linkUrl} target="_blank">
                {ad.linkText}
              </Button>
            </>
          ) : (
            <>
              <Skeleton active title={false} paragraph={{rows: 3}} />
              <Skeleton.Button active />
            </>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};
