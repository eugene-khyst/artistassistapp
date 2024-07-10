/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {FullscreenExitOutlined, FullscreenOutlined} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {Alert, Col, FloatButton, Row, Tabs, theme} from 'antd';
import StickyBox from 'react-sticky-box';

import {PromiseErrorBoundary} from '~/src/components/alert/PromiseErrorBoundary';
import {ImageOutline} from '~/src/components/ImageOutline';
import {ImagesCompare} from '~/src/components/ImagesCompare';
import {Install} from '~/src/components/Install';
import {useFullScreen} from '~/src/hooks';
import {useInstallPrompt} from '~/src/hooks/useInstallPrompt';
import {DisplayMode, usePwaDisplayMode} from '~/src/hooks/usePwaDisplayMode';
import {useAppStore} from '~/src/stores/app-store';

import {BrowserSupport} from './components/alert/BrowserSupport';
import {ColorMixer} from './components/ColorMixer';
import {ColorSetChooser} from './components/ColorSetChooser';
import {Help} from './components/Help';
import {ImageBlurred} from './components/ImageBlurred';
import {ImageChooser} from './components/ImageChooser';
import {ImageColorPicker} from './components/ImageColorPicker';
import {ImageGrid} from './components/ImageGrid';
import {ImageLimitedPalette} from './components/ImageLimitedPalette';
import {ImageTonalValues} from './components/ImageTonalValues';
import {Palette} from './components/Palette';
import {watermarkText} from './config';
import {TabKey} from './types';

export const ArtistAssistApp: React.FC = () => {
  const activeTabKey = useAppStore(state => state.activeTabKey);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {
    token: {colorBgContainer},
  } = theme.useToken();

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  const {showInstallPromotion, promptToInstall} = useInstallPrompt();
  const pwaDisplayMode: DisplayMode = usePwaDisplayMode();

  const handleTabChange = (activeKey: string) => {
    void setActiveTabKey(activeKey as TabKey);
  };

  const items = [
    {
      key: TabKey.ColorSet,
      label: 'Color set',
      children: <ColorSetChooser showInstallPromotion={showInstallPromotion} />,
    },
    {
      key: TabKey.Photo,
      label: 'Photo',
      children: <ImageChooser />,
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
    ...(pwaDisplayMode === DisplayMode.BROWSER
      ? [
          {
            key: TabKey.Install,
            label: 'Install',
            children: (
              <Install
                showInstallPromotion={showInstallPromotion}
                promptToInstall={promptToInstall}
              />
            ),
          },
        ]
      : []),
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
