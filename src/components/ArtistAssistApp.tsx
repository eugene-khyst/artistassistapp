/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {FullscreenExitOutlined, FullscreenOutlined} from '@ant-design/icons';
import type {TabsProps} from 'antd';
import {App, Col, FloatButton, Row, Tabs, theme} from 'antd';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import StickyBox from 'react-sticky-box';
import {useEventListener, useTimeout} from 'usehooks-ts';
import {AppConfig, AppConfigContext} from '../context/AppConfigContext';
import {useAds} from '../hooks/useAds';
import {useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {useFullScreen} from '../hooks/useFullscreen';
import {
  PAPER_WHITE_HEX,
  PaintMix,
  PaintSet,
  Pipet,
  UrlParsingResult,
  parseUrl,
} from '../services/color';
import {Rgb, RgbTuple} from '../services/color/model';
import {IMAGE_SIZE, createScaledImageBitmap} from '../utils';
import {BrowserNotSupported} from './BrowserNotSupported';
import {Help} from './Help';
import {ImageColorPicker} from './ImageColorPicker';
import {ImageGrid} from './ImageGrid';
import {ImagePrimaryColors} from './ImagePrimaryColors';
import {ImageSelect} from './ImageSelect';
import {ImageSketch} from './ImageSketch';
import {ImageTonalValues} from './ImageTonalValues';
import {PaintMixer} from './PaintMixer';
import {PaintSetSelect} from './PaintSetSelect';
import {Palette} from './Palette';
import {TabKey} from './types';

const browserFeatures: Record<string, boolean> = {
  Worker: typeof Worker !== 'undefined',
  OffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  createImageBitmap: typeof createImageBitmap !== 'undefined',
  indexedDB: typeof indexedDB !== 'undefined',
};
const isBrowserSupported = Object.values(browserFeatures).every(value => value);

const {paintSet: importedPaintSet, paintMix: importedPaintMix}: UrlParsingResult = parseUrl(
  window.location.toString()
);
if (importedPaintSet || importedPaintMix) {
  history.pushState({}, '', '/');
}

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => {
  return [await createScaledImageBitmap(blob, IMAGE_SIZE['2K'])];
};

export const ArtistAssistApp: React.FC = () => {
  const {
    token: {colorBgContainer},
  } = theme.useToken();
  const {watermarkText} = useContext<AppConfig>(AppConfigContext);

  const {message} = App.useApp();

  const {isFullscreen, toggleFullScreen} = useFullScreen();

  const [activeTabKey, setActiveTabKey] = useState<TabKey>(TabKey.ColorSet);
  const [paintSet, setPaintSet] = useState<PaintSet | undefined>();
  const [blob, setBlob] = useState<Blob | undefined>();
  const [imageFileId, setImageFileId] = useState<number | undefined>();
  const [backgroundColor, setBackgroundColor] = useState<string>(PAPER_WHITE_HEX);
  const [isGlaze, setIsGlaze] = useState<boolean>(false);
  const [pipet, setPipet] = useState<Pipet | undefined>();
  const [paintMixes, setPaintMixes] = useState<PaintMix[] | undefined>();

  const {images, isLoading: isImagesLoading} = useCreateImageBitmap(
    blobToImageBitmapsConverter,
    blob
  );

  const importPaintMixWaitingRef = useRef<boolean>(true);

  useTimeout(() => (importPaintMixWaitingRef.current = false), 1000);

  useEffect(() => {
    if (importedPaintMix && importPaintMixWaitingRef.current) {
      setActiveTabKey(TabKey.Palette);
    } else {
      if (!paintSet) {
        setActiveTabKey(TabKey.ColorSet);
      } else if (!blob) {
        setActiveTabKey(TabKey.Photo);
      } else {
        setActiveTabKey(TabKey.ColorPicker);
        message.info('🔎 Pinch to zoom (or use the mouse wheel) and drag to pan');
      }
    }
  }, [paintSet, blob, message]);

  useEventListener('beforeunload', event => {
    event.returnValue = 'Are you sure you want to leave?';
  });

  const {ads} = useAds();

  const setColorPicker = useCallback((pipet?: Pipet) => {
    if (pipet) {
      setPipet({...pipet});
      setActiveTabKey(TabKey.ColorPicker);
    }
  }, []);

  const setAsBackground = useCallback(
    (background: string | RgbTuple) => {
      setBackgroundColor(Rgb.fromHexOrTuple(background).toHex());
      setIsGlaze(true);
      setActiveTabKey(TabKey.ColorPicker);
    },
    [setBackgroundColor, setIsGlaze]
  );

  const handleTabChange = (activeKey: string) => {
    setActiveTabKey(activeKey as TabKey);
  };

  const items = [
    {
      key: TabKey.ColorSet,
      label: 'Color set',
      children: (
        <PaintSetSelect
          setPaintSet={setPaintSet}
          importedPaintSet={importedPaintSet}
          setActiveTabKey={setActiveTabKey}
          ads={ads}
        />
      ),
      forceRender: true,
    },
    {
      key: TabKey.Photo,
      label: 'Photo',
      children: (
        <ImageSelect setBlob={setBlob} imageFileId={imageFileId} setImageFileId={setImageFileId} />
      ),
      forceRender: true,
    },
    {
      key: TabKey.ColorPicker,
      label: 'Color picker',
      children: (
        <ImageColorPicker
          paintSet={paintSet}
          imageFileId={imageFileId}
          images={images}
          isImagesLoading={isImagesLoading}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          isGlaze={isGlaze}
          setIsGlaze={setIsGlaze}
          pipet={pipet}
          paintMixes={paintMixes}
          setPaintMixes={setPaintMixes}
          setAsBackground={setAsBackground}
        />
      ),
      forceRender: true,
    },
    {
      key: TabKey.Palette,
      label: 'Palette',
      children: (
        <Palette
          paintSet={paintSet}
          imageFileId={imageFileId}
          paintMixes={paintMixes}
          setPaintMixes={setPaintMixes}
          setColorPicker={setColorPicker}
          setAsBackground={setAsBackground}
          importedPaintMix={importedPaintMix}
          blob={blob}
        />
      ),
      forceRender: true,
    },
    {
      key: TabKey.TonalValues,
      label: 'Tonal values',
      children: <ImageTonalValues blob={blob} images={images} isImagesLoading={isImagesLoading} />,
      forceRender: true,
    },
    {
      key: TabKey.SimplifiedPhoto,
      label: 'Simplified',
      children: <ImageSketch blob={blob} />,
      forceRender: true,
    },
    {
      key: TabKey.Grid,
      label: 'Grid',
      children: <ImageGrid images={images} isImagesLoading={isImagesLoading} />,
    },
    {
      key: TabKey.ColorMixing,
      label: 'Color mixing',
      children: <PaintMixer paintSet={paintSet} />,
    },
    {
      key: TabKey.LimitedPalette,
      label: 'Limited palette',
      children: (
        <ImagePrimaryColors
          paintSet={paintSet}
          blob={blob}
          images={images}
          isImagesLoading={isImagesLoading}
        />
      ),
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

  if (!isBrowserSupported) {
    return <BrowserNotSupported browserFeatures={browserFeatures} />;
  }

  return (
    <>
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
    </>
  );
};
