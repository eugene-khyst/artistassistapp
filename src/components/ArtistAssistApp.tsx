/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {Alert, Button, Col, FloatButton, Row, Tabs, Tooltip, theme} from 'antd';
import {useCallback, useState} from 'react';
import StickyBox from 'react-sticky-box';
import {useFullScreen} from '../hooks/useFullscreen';
import {OFF_WHITE_HEX, PaintMix, PaintSet} from '../services/color';
import {Rgb, RgbTuple} from '../services/color/model';
import {AboutModal} from './AboutModal';
import {ImageColorPicker} from './ImageColorPicker';
import {ImageSketch} from './ImageSketch';
import {ImageTonalValues} from './ImageTonalValues';
import {PaintSetChooser} from './PaintSetChooser';
import {Palette} from './Palette';
import {ReflectanceChartDrawer} from './ReflectanceChartDrawer';
import {SelectImage} from './SelectImage';
import {TabKey} from './types';

const isBrowserSupported =
  typeof Worker &&
  typeof OffscreenCanvas !== 'undefined' &&
  typeof createImageBitmap !== 'undefined' &&
  typeof indexedDB !== 'undefined';

export const ArtistAssistApp: React.FC = () => {
  const {
    token: {colorBgContainer},
  } = theme.useToken();

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  const [activeTabKey, setActiveTabKey] = useState<TabKey>(TabKey.Paints);
  const [paintSet, setPaintSet] = useState<PaintSet | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const [backgroundColor, setBackgroundColor] = useState<string>(OFF_WHITE_HEX);
  const [isGlaze, setIsGlaze] = useState<boolean>(false);
  const [reflectanceChartPaintMix, setReflectanceChartPaintMix] = useState<PaintMix | undefined>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);
  const [paintMixes, setPaintMixes] = useState<PaintMix[] | undefined>();
  const [isAboutModelOpen, setIsAboutModalOpen] = useState<boolean>(false);

  const setAsBackground = useCallback(
    (background: string | RgbTuple) => {
      setBackgroundColor(Rgb.fromHexOrTuple(background).toHex());
      setIsGlaze(true);
      setActiveTabKey(TabKey.Colors);
    },
    [setBackgroundColor, setIsGlaze]
  );

  const showReflectanceChart = useCallback((paintMix: PaintMix) => {
    setReflectanceChartPaintMix(paintMix);
    setIsOpenReflectanceChart(true);
  }, []);

  const showAboutModal = () => {
    setIsAboutModalOpen(true);
  };

  const items = [
    {
      key: TabKey.Paints,
      label: 'Paints',
      children: <PaintSetChooser {...{setPaintSet, setActiveTabKey, file}} />,
    },
    {
      key: TabKey.Photo,
      label: 'Photo',
      children: <SelectImage {...{setFile, setActiveTabKey}} />,
      disabled: !paintSet,
    },
    {
      key: TabKey.Colors,
      label: 'Colors',
      children: (
        <ImageColorPicker
          {...{
            paintSet,
            file,
            backgroundColor,
            setBackgroundColor,
            isGlaze,
            setIsGlaze,
            paintMixes,
            setPaintMixes,
            setAsBackground,
            showReflectanceChart,
          }}
        />
      ),
      forceRender: true,
      disabled: !paintSet,
    },
    {
      key: TabKey.Palette,
      label: 'Palette',
      children: <Palette {...{paintMixes, setPaintMixes, setAsBackground, showReflectanceChart}} />,
      forceRender: true,
    },
    {
      key: TabKey.Sketch,
      label: 'Sketch',
      children: <ImageSketch file={file} />,
      forceRender: true,
      disabled: !paintSet || !file,
    },
    {
      key: TabKey.TonalValues,
      label: 'Tonal Values',
      children: <ImageTonalValues file={file} />,
      forceRender: true,
      disabled: !paintSet || !file,
    },
  ];

  const renderTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
    <StickyBox offsetTop={0} offsetBottom={20} style={{zIndex: 10}}>
      <DefaultTabBar {...props} style={{background: colorBgContainer}} />
    </StickyBox>
  );

  if (!isBrowserSupported) {
    return (
      <Alert
        message="Error"
        description="Your browser is not supported. Use the latest version of the browser to access the web app."
        type="error"
        showIcon
        style={{margin: '16px'}}
      />
    );
  }

  return (
    <>
      <Row justify="center">
        <Col xs={24} xxl={18}>
          <Tabs
            renderTabBar={renderTabBar}
            items={items}
            activeKey={activeTabKey}
            onChange={(activeKey: string) => setActiveTabKey(activeKey as TabKey)}
            size="large"
            tabBarGutter={0}
            tabBarExtraContent={{
              right: (
                <Tooltip title="Help">
                  <Button type="link" icon={<QuestionCircleOutlined />} onClick={showAboutModal} />
                </Tooltip>
              ),
            }}
          />
        </Col>
      </Row>
      <ReflectanceChartDrawer
        paintMix={reflectanceChartPaintMix}
        open={isOpenReflectanceChart}
        onClose={() => setIsOpenReflectanceChart(false)}
      />
      <FloatButton
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        shape="square"
        tooltip={isFullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={toggleFullScreen}
        style={{right: 24, bottom: 24}}
      />
      <AboutModal open={isAboutModelOpen} setOpen={setIsAboutModalOpen} />
    </>
  );
};
