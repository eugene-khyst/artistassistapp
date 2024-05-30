/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {FullscreenExitOutlined, FullscreenOutlined} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {Alert, Col, FloatButton, Row, Tabs, theme} from 'antd';
import StickyBox from 'react-sticky-box';
import {useEventListener} from 'usehooks-ts';

import {PromiseErrorBoundary} from '~/src/components/alert/PromiseErrorBoundary';
import {ImageOutline} from '~/src/components/ImageOutline';
import {ImagesCompare} from '~/src/components/ImagesCompare';
import {appConfig} from '~/src/config';
import {useAds} from '~/src/hooks/useAds';
import {useFullScreen} from '~/src/hooks/useFullscreen';
import {useAppStore} from '~/src/stores/app-store';

import {BrowserSupport} from './components/alert/BrowserSupport';
import {ColorMixer} from './components/ColorMixer';
import {ColorSetSelect} from './components/ColorSetSelect';
import {Help} from './components/Help';
import {ImageBlurred} from './components/ImageBlurred';
import {ImageColorPicker} from './components/ImageColorPicker';
import {ImageGrid} from './components/ImageGrid';
import {ImageLimitedPalette} from './components/ImageLimitedPalette';
import {ImageSelect} from './components/ImageSelect';
import {ImageTonalValues} from './components/ImageTonalValues';
import {Palette} from './components/Palette';
import {TabKey} from './types';

export const ArtistAssistApp: React.FC = () => {
  const activeTabKey = useAppStore(state => state.activeTabKey);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {
    token: {colorBgContainer},
  } = theme.useToken();
  const {watermarkText} = appConfig;

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  useEventListener('beforeunload', event => {
    event.preventDefault();
    // Included for legacy support, e.g. Chrome/Edge < 119
    event.returnValue = true;
  });

  const {ads} = useAds();

  const handleTabChange = (activeKey: string) => {
    setActiveTabKey(activeKey as TabKey);
  };

  const items = [
    {
      key: TabKey.ColorSet,
      label: 'Color set',
      children: <ColorSetSelect ads={ads} />,
    },
    {
      key: TabKey.Photo,
      label: 'Photo',
      children: <ImageSelect />,
    },
    {
      key: TabKey.ColorPicker,
      label: 'Color picker',
      children: <ImageColorPicker />,
    },
    {
      key: TabKey.Palette,
      label: 'Palette',
      children: <Palette />,
    },
    {
      key: TabKey.TonalValues,
      label: 'Tonal values',
      children: <ImageTonalValues />,
    },
    {
      key: TabKey.SimplifiedPhoto,
      label: 'Simplified',
      children: <ImageBlurred />,
    },
    {
      key: TabKey.Outline,
      label: 'Outline',
      children: <ImageOutline />,
    },
    {
      key: TabKey.Grid,
      label: 'Grid',
      children: <ImageGrid />,
    },
    {
      key: TabKey.ColorMixing,
      label: 'Color mixing',
      children: <ColorMixer />,
    },
    {
      key: TabKey.LimitedPalette,
      label: 'Limited palette',
      children: <ImageLimitedPalette />,
    },
    {
      key: TabKey.Compare,
      label: 'Compare',
      children: <ImagesCompare />,
    },
    {
      key: TabKey.Help,
      label: 'Help',
      children: <Help />,
    },
  ];

  const renderTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{zIndex: 10}}>
      <DefaultTabBar {...props} style={{background: colorBgContainer}} />
    </StickyBox>
  );

  return (
    <Alert.ErrorBoundary>
      <PromiseErrorBoundary>
        <BrowserSupport>
          <div className="watermark">{watermarkText}</div>
          <Row justify="center">
            <Col xs={24} xxl={18}>
              <Tabs
                renderTabBar={renderTabBar}
                items={items}
                activeKey={activeTabKey}
                onChange={handleTabChange}
                size="large"
                tabBarGutter={0}
              />
            </Col>
          </Row>
          <FloatButton
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            shape="square"
            onClick={toggleFullScreen}
            style={{right: 24, bottom: 24}}
          />
        </BrowserSupport>
      </PromiseErrorBoundary>
    </Alert.ErrorBoundary>
  );
};
