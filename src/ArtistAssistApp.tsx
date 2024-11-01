/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {FullscreenExitOutlined, FullscreenOutlined} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {App, Col, FloatButton, Row, Tabs, theme} from 'antd';
import {useEffect, useRef, useState} from 'react';
import StickyBox from 'react-sticky-box';

import {AdModal} from '~/src/components/ad/AdModal';
import {ImageOutline} from '~/src/components/ImageOutline';
import {ImagesCompare} from '~/src/components/ImagesCompare';
import {Install} from '~/src/components/Install';
import {TabContext} from '~/src/contexts/TabContext';
import {useFullScreen} from '~/src/hooks';
import {useAuth} from '~/src/hooks/useAuth';
import {useInstallPrompt} from '~/src/hooks/useInstallPrompt';
import {useDisplayMode} from '~/src/hooks/usePwaDisplayMode';
import {useAppStore} from '~/src/stores/app-store';
import {DisplayMode} from '~/src/utils';

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
import {WATERMARK_TEXT} from './config';
import {TAB_LABELS, TabKey} from './tabs';

const AD_POPUP_INITIAL_DELAY = 1 * 60000;
const AD_POPUP_INTERVAL = 15 * 60000;

export const ArtistAssistApp: React.FC = () => {
  const activeTabKey = useAppStore(state => state.activeTabKey);

  const initAppStore = useAppStore(state => state.initAppStore);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {modal} = App.useApp();

  const {
    token: {colorBgContainer},
  } = theme.useToken();

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  const {showInstallPromotion, promptToInstall} = useInstallPrompt();
  const pwaDisplayMode: DisplayMode = useDisplayMode();

  const {user, isLoading: isAuthLoading, error: authError} = useAuth();

  const isInitialized = useRef<boolean>(false);

  const [isAdModalReady, setIsAdModalReady] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(true);

  useEffect(() => {
    void (async () => {
      if (authError) {
        await modal.warning({
          title: 'Login failed',
          content: authError,
        });
      }
    })();
  }, [authError, modal]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsAdModalReady(true), AD_POPUP_INITIAL_DELAY);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isAdModalReady) {
      return;
    }
    const intervalId = setInterval(() => setIsAdModalOpen(true), AD_POPUP_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isAdModalReady]);

  useEffect(() => {
    if (isAuthLoading || isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    void initAppStore(user);
  }, [isAuthLoading, user, initAppStore]);

  const handleTabChange = (activeKey: string) => {
    void setActiveTabKey(activeKey as TabKey);
  };

  const items = [
    {
      key: TabKey.ColorSet,
      children: <ColorSetChooser showInstallPromotion={showInstallPromotion} />,
    },
    {
      key: TabKey.Photo,
      children: <ImageChooser />,
    },
    {
      key: TabKey.ColorPicker,
      children: <ImageColorPicker />,
    },
    {
      key: TabKey.Palette,
      children: <Palette />,
    },
    {
      key: TabKey.TonalValues,
      children: <ImageTonalValues />,
    },
    {
      key: TabKey.SimplifiedPhoto,
      children: <ImageBlurred />,
    },
    {
      key: TabKey.Outline,
      children: <ImageOutline />,
    },
    {
      key: TabKey.Grid,
      children: <ImageGrid />,
    },
    {
      key: TabKey.ColorMixing,
      children: <ColorMixer />,
    },
    {
      key: TabKey.LimitedPalette,
      children: <ImageLimitedPalette />,
    },
    {
      key: TabKey.Compare,
      children: <ImagesCompare />,
    },
    ...(pwaDisplayMode === DisplayMode.BROWSER
      ? [
          {
            key: TabKey.Install,
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
      children: <Help />,
    },
  ].map(({key, children}) => ({
    key,
    label: TAB_LABELS[key],
    children: <TabContext.Provider value={key}>{children}</TabContext.Provider>,
  }));

  const renderTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{zIndex: 10}}>
      <DefaultTabBar {...props} style={{background: colorBgContainer}} />
    </StickyBox>
  );

  return (
    <>
      <div className="watermark">{WATERMARK_TEXT}</div>
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
      <AdModal open={isAdModalReady && isAdModalOpen} setOpen={setIsAdModalOpen} />
    </>
  );
};
