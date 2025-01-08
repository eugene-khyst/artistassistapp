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

import {Button, Flex, Grid, Space, Typography} from 'antd';
import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import reactStringReplace from 'react-string-replace';

import {API_URL} from '~/src/config';
import type {AdDefinition} from '~/src/services/ads';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {randomInt} from '~/src/utils';

const AD_CHANGE_INTERVAL = 15 * 1000;
const IMAGE_SIZE = {width: 200, heigth: 200};

function getImageUrl(image: string, adsUrl: string): string {
  return new URL(image, adsUrl).toString();
}

function formatRichText(text: string): ReactNode[] {
  let i = 1;
  let replacedText: ReactNode[];
  replacedText = reactStringReplace(text, '<br/>', () => <br key={i++} />);
  replacedText = reactStringReplace(replacedText, /<strong>(.+?)<\/strong>/g, match => (
    <Typography.Text strong key={i++}>
      {match}
    </Typography.Text>
  ));
  replacedText = reactStringReplace(replacedText, /<code>(.+?)<\/code>/g, match => (
    <Typography.Text code key={i++}>
      {match}
    </Typography.Text>
  ));
  return replacedText;
}

interface Props {
  ads?: AdDefinition[];
  vertical?: boolean;
  footer?: ReactNode;
  style?: React.CSSProperties;
}

export const Ad: React.FC<Props> = ({ads, vertical = false, footer, style}: Props) => {
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const screens = Grid.useBreakpoint();

  const [adIndex, setAdIndex] = useState<number>(randomInt(0, 9));

  useEffect(() => {
    const intervalId = setInterval(() => {
      setAdIndex((prev: number) => prev + 1);
    }, AD_CHANGE_INTERVAL);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  if (!ads?.length) {
    return <></>;
  }
  const ad: AdDefinition | null = ads[adIndex % ads.length]!;
  return (
    <Flex vertical={vertical || !screens.md} align="center">
      {ad.image && (
        <img
          src={getImageUrl(ad.image, API_URL)}
          alt="Ad"
          crossOrigin="anonymous"
          style={{
            ...IMAGE_SIZE,
            display: 'block',
            objectFit: 'contain',
          }}
        />
      )}
      <Flex vertical align="flex-start" style={{padding: 16, ...style}}>
        <div style={{marginBottom: 16, textAlign: 'justify'}}>{formatRichText(ad.text)}</div>
        <Space>
          {ad.linkUrl && (
            <Button type="primary" size="large" href={ad.linkUrl} target="_blank">
              {ad.linkText}
            </Button>
          )}
          {ad.linkTab && Object.values(TabKey).includes(ad.linkTab as TabKey) && (
            <Button
              type="primary"
              size="large"
              onClick={() => void setActiveTabKey(ad.linkTab as TabKey)}
            >
              {ad.linkText}
            </Button>
          )}
          {footer}
        </Space>
      </Flex>
    </Flex>
  );
};
