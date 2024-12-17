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

import {DownloadOutlined} from '@ant-design/icons';
import {Button, Flex, Space, Spin, Typography} from 'antd';
import {saveAs} from 'file-saver';
import type {CSSProperties} from 'react';
import {type ChangeEvent, useEffect, useState} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {FileSelect} from '~/src/components/image/FileSelect';
import {useCreateObjectUrl} from '~/src/hooks';
import {removeBackground} from '~/src/services/image';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

export const ImageBackgroundRemove: React.FC = () => {
  const imageToRemoveBg = useAppStore(state => state.imageToRemoveBg);

  const setImageToRemoveBg = useAppStore(state => state.setImageToRemoveBg);

  const [noBgBlob, setNoBgBlob] = useState<Blob>();
  const [position, setPosition] = useState<number>(100);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPercent, setLoadingPercent] = useState<number>(100);
  const [loadingTip, setLoadingTip] = useState<string>();

  const imageUrl: string | undefined = useCreateObjectUrl(imageToRemoveBg);
  const noBgImageUrl: string | undefined = useCreateObjectUrl(noBgBlob);

  useEffect(() => {
    void (async () => {
      if (imageToRemoveBg) {
        setIsLoading(true);
        setLoadingPercent(0);
        setLoadingTip('Loading');
        setNoBgBlob(undefined);

        setPosition(100);

        setNoBgBlob(
          await removeBackground(imageToRemoveBg, (key, current, total) => {
            setLoadingPercent((100.0 * current) / total);
            setLoadingTip(key);
          })
        );
        setPosition(25);

        setIsLoading(false);
      }
    })();
  }, [imageToRemoveBg]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    setImageToRemoveBg(file);
  };

  const handleSaveClick = () => {
    if (noBgImageUrl) {
      saveAs(noBgImageUrl, getFilename(imageToRemoveBg, 'no-bg', 'png'));
    }
  };

  const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: `calc(100vh - 145px)`,
    objectFit: 'contain',
  };

  return (
    <Spin spinning={isLoading} percent={loadingPercent} tip={loadingTip} size="large">
      <Flex vertical gap="small" style={{marginBottom: 8, padding: '0 16px'}}>
        <Typography.Text strong>Select a photo to remove the background from</Typography.Text>
        <Space>
          <FileSelect onChange={handleFileChange}>Select photo</FileSelect>
          {noBgImageUrl && (
            <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
              Save
            </Button>
          )}
        </Space>
      </Flex>

      <ReactCompareSlider
        position={position}
        itemOne={
          imageUrl && (
            <ReactCompareSliderImage src={imageUrl} alt="Original photo" style={imageStyle} />
          )
        }
        itemTwo={
          noBgImageUrl && (
            <ReactCompareSliderImage
              src={noBgImageUrl}
              alt="Image without background"
              style={{backgroundColor: '#fff', ...imageStyle}}
            />
          )
        }
      />
    </Spin>
  );
};
