/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {FullscreenExitOutlined, FullscreenOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import type {TabsProps} from 'antd';
import {Col, FloatButton, Row, Tabs} from 'antd';
import {useContext, useEffect} from 'react';
import StickyBox from 'react-sticky-box';

import {AdModal} from '@/components/ad/AdModal';
import {ColorMixingChart} from '@/components/ColorMixingChart';
import {CustomColorBrandCreator} from '@/components/CustomColorBrandCreator';
import {ImageBackgroundRemoval} from '@/components/ImageBackgroundRemoval';
import {ImageColorAdjustment} from '@/components/ImageColorAdjustment';
import {ImageOutline} from '@/components/ImageOutline';
import {ImagePerspectiveCorrection} from '@/components/ImagePerspectiveCorrection';
import {ImagesCompare} from '@/components/ImagesCompare';
import {ImageStyleTransfer} from '@/components/ImageStyleTransfer';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {TAB_LABELS} from '@/components/messages';
import {TabContext} from '@/contexts/TabContext';
import {UnsavedChangesContext} from '@/contexts/UnsavedChangesContext';
import {useColorSetBackup} from '@/hooks/useColorSetBackup';
import {useDoubleBackPressToExit} from '@/hooks/useDoubleBackPressToExit';
import {useFullScreen} from '@/hooks/useFullscreen';
import {useInstall} from '@/hooks/useInstall';
import {useAppStore} from '@/stores/app-store';

import styles from './ArtistAssistApp.module.css';
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

const tabMore: TabsProps['more'] = {trigger: ['click']};

export function ArtistAssistApp() {
  const activeTabKey = useAppStore(state => state.activeTabKey);
  const user = useAppStore(state => state.auth?.user);

  const isAppInitializing = useAppStore(state => state.isAppInitializing);
  const isLocaleLoading = useAppStore(state => state.isLocaleLoading);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {checkUnsaved} = useContext(UnsavedChangesContext);

  const {t} = useLingui();

  const {isFullscreen, toggleFullScreen, isSupported: isFullScreenSupported} = useFullScreen();

  const isLoading: boolean = isAppInitializing || isLocaleLoading || isAuthLoading;

  const appInitialized = useAppStore(state => state.appInitialized);
  const installRequested = useAppStore(state => state.installRequested);
  const saveColorSetsAsJsonAndNotify = useColorSetBackup();
  const {install, installDrawer} = useInstall();

  useDoubleBackPressToExit();

  useEffect(() => {
    if (appInitialized) {
      void saveColorSetsAsJsonAndNotify();
    }
  }, [appInitialized, saveColorSetsAsJsonAndNotify]);

  const resetInstallRequested = useAppStore(state => state.resetInstallRequested);

  useEffect(() => {
    if (installRequested) {
      install();
      resetInstallRequested();
    }
  }, [installRequested, install, resetInstallRequested]);

  const handleTabChange = (activeKey: string) => {
    void (async () => {
      await checkUnsaved();
      void setActiveTabKey(activeKey as TabKey);
    })();
  };

  const items: TabsProps['items'] = [
    {
      key: TabKey.ColorSet,
      children: <ColorSetChooser />,
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
      key: TabKey.ColorMixingChart,
      children: <ColorMixingChart />,
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
      key: TabKey.PerspectiveCorrection,
      children: <ImagePerspectiveCorrection />,
    },
    {
      key: TabKey.ColorAdjustment,
      children: <ImageColorAdjustment />,
    },
    {
      key: TabKey.BackgroundRemove,
      children: <ImageBackgroundRemoval />,
    },
    {
      key: TabKey.Compare,
      children: <ImagesCompare />,
    },
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
    <StickyBox offsetTop={0} offsetBottom={20} className={styles['stickyTabBar']}>
      <DefaultTabBar mobile={false} {...props} className={styles['tabBar']} />
    </StickyBox>
  );

  return (
    <LoadingIndicator loading={isLoading}>
      <div className={styles['watermark']}>{WATERMARK_TEXT}</div>
      <Row justify="center">
        <Col xs={24} xxl={18}>
          <Tabs
            className={styles['tabs']}
            renderTabBar={renderTabBar}
            items={items}
            activeKey={activeTabKey}
            onChange={handleTabChange}
            more={tabMore}
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
          className={styles['fullscreenButton']}
        />
      )}
      <AdModal />
      {installDrawer}
    </LoadingIndicator>
  );
}
