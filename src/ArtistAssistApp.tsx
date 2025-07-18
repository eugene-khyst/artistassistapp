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

import {FullscreenExitOutlined, FullscreenOutlined, LoadingOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import type {TabsProps} from 'antd';
import {App, Col, FloatButton, Row, Spin, Tabs, theme} from 'antd';
import {useEffect, useRef, useState} from 'react';
import StickyBox from 'react-sticky-box';

import {AdModal} from '~/src/components/ad/AdModal';
import {CustomColorBrandCreator} from '~/src/components/CustomColorBrandCreator';
import {ImageBackgroundRemoval} from '~/src/components/ImageBackgroundRemoval';
import {ImageColorAdjustment} from '~/src/components/ImageColorAdjustment';
import {ImageOutline} from '~/src/components/ImageOutline';
import {ImagePerspectiveCorrection} from '~/src/components/ImagePerspectiveCorrection';
import {ImagesCompare} from '~/src/components/ImagesCompare';
import {ImageStyleTransfer} from '~/src/components/ImageStyleTransfer';
import {Install} from '~/src/components/Install';
import {AUTH_ERROR_MESSAGES, TAB_LABELS} from '~/src/components/messages';
import type {ChangableComponent} from '~/src/components/types';
import {TabContext} from '~/src/contexts/TabContext';
import {useDoubleBackPressToExit} from '~/src/hooks/useDoubleBackPressToExit';
import {useFullScreen} from '~/src/hooks/useFullscreen';
import {useInstallPrompt} from '~/src/hooks/useInstallPrompt';
import {useDisplayMode} from '~/src/hooks/usePwaDisplayMode';
import {useAppStore} from '~/src/stores/app-store';
import {DisplayMode} from '~/src/utils/media';

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
import {TabKey} from './tabs';

const AD_POPUP_INITIAL_DELAY = 1 * 60000;
const AD_POPUP_INTERVAL = 15 * 60000;

export const ArtistAssistApp: React.FC = () => {
  const activeTabKey = useAppStore(state => state.activeTabKey);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);
  const isLocaleLoading = useAppStore(state => state.isLocaleLoading);
  const user = useAppStore(state => state.auth?.user);
  const authError = useAppStore(state => state.authError);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  const clearAuthError = useAppStore(state => state.clearAuthError);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {modal} = App.useApp();

  const {
    token: {colorBgContainer},
  } = theme.useToken();

  const {t} = useLingui();

  const {isFullscreen, toggleFullScreen, isSupported: isFullScreenSupported} = useFullScreen();

  const {showInstallPromotion, promptToInstall} = useInstallPrompt();
  const pwaDisplayMode: DisplayMode = useDisplayMode();

  const colorSetChooserRef = useRef<ChangableComponent>(null);

  const [isAdModalReady, setIsAdModalReady] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(true);

  const isLoading: boolean = isInitialStateLoading || isLocaleLoading || isAuthLoading;

  useDoubleBackPressToExit();

  useEffect(() => {
    void (async () => {
      if (authError) {
        const message = AUTH_ERROR_MESSAGES[authError.type];
        await modal.warning({
          title: t`Login failed`,
          content: message ? t(message) : authError.message,
          afterClose() {
            clearAuthError();
            void setActiveTabKey(TabKey.ColorSet);
          },
        });
      }
    })();
  }, [modal, authError, clearAuthError, setActiveTabKey, t]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsAdModalReady(true);
    }, AD_POPUP_INITIAL_DELAY);
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isAdModalReady) {
      return;
    }
    const intervalId = setInterval(() => {
      setIsAdModalOpen(true);
    }, AD_POPUP_INTERVAL);
    return () => {
      clearInterval(intervalId);
    };
  }, [isAdModalReady]);

  const handleTabChange = (activeKey: string) => {
    void (async () => {
      await colorSetChooserRef.current?.checkForUnsavedChanges();
      void setActiveTabKey(activeKey as TabKey);
    })();
  };

  const items: TabsProps['items'] = [
    {
      key: TabKey.ColorSet,
      children: (
        <ColorSetChooser ref={colorSetChooserRef} showInstallPromotion={showInstallPromotion} />
      ),
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
      key: TabKey.ColorMixing,
      children: <ColorMixer />,
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
      key: TabKey.TonalValues,
      children: <ImageTonalValues />,
    },
    {
      key: TabKey.SimplifiedPhoto,
      children: <ImageBlurred />,
    },
    {
      key: TabKey.LimitedPalette,
      children: <ImageLimitedPalette />,
    },
    {
      key: TabKey.StyleTransfer,
      children: <ImageStyleTransfer />,
    },
    {
      key: TabKey.ColorAdjustment,
      children: <ImageColorAdjustment />,
    },
    {
      key: TabKey.PerspectiveCorrection,
      children: <ImagePerspectiveCorrection />,
    },
    {
      key: TabKey.BackgroundRemove,
      children: <ImageBackgroundRemoval />,
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
    ...(user
      ? [
          {
            key: TabKey.CustomColorBrand,
            children: <CustomColorBrandCreator />,
          },
        ]
      : []),
    {
      key: TabKey.Help,
      children: <Help />,
    },
  ].map(({key, children}) => ({
    key,
    label: t(TAB_LABELS[key]),
    children: <TabContext.Provider value={key}>{children}</TabContext.Provider>,
  }));

  const renderTabBar: TabsProps['renderTabBar'] = ({mobile: _, ...props}, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{zIndex: 10}}>
      <DefaultTabBar mobile={false} {...props} style={{background: colorBgContainer}} />
    </StickyBox>
  );

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined spin />} size="large">
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
      {isFullScreenSupported && (
        <FloatButton
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          shape="square"
          onClick={toggleFullScreen}
          style={{right: 24, bottom: 24}}
        />
      )}
      <AdModal open={isAdModalReady && isAdModalOpen} setOpen={setIsAdModalOpen} />
    </Spin>
  );
};
