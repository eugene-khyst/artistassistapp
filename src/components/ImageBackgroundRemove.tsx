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
import {Button, Space, Spin} from 'antd';
import {saveAs} from 'file-saver';
import type {CSSProperties} from 'react';
import {type ChangeEvent, useState} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {ImageSelect} from '~/src/components/image/ImageSelect';
import {useCreateObjectUrl} from '~/src/hooks';
import {removeBackground} from '~/src/services/image';

function getNoBgFilename(file?: File): string | undefined {
  if (!file) {
    return;
  }
  const {name} = file;
  return `${name.substring(0, name.lastIndexOf('.'))}-no-bg.png`;
}

export const ImageBackgroundRemove: React.FC = () => {
  const [file, setFile] = useState<File>();
  const [noBgBlob, setNoBgBlob] = useState<Blob>();
  const [position, setPosition] = useState<number>(100);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPercent, setLoadingPercent] = useState<number>(100);
  const [loadingTip, setLoadingTip] = useState<string>();

  const imageUrl: string | undefined = useCreateObjectUrl(file);
  const noBgImageUrl: string | undefined = useCreateObjectUrl(noBgBlob);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setLoadingPercent(0);
      setLoadingTip('Loading');

      setFile(file);
      setPosition(100);

      setNoBgBlob(
        await removeBackground(file, (key, current, total) => {
          setLoadingPercent((100.0 * current) / total);
          setLoadingTip(key);
        })
      );
      setPosition(25);

      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (noBgImageUrl) {
      saveAs(noBgImageUrl, getNoBgFilename(file));
    }
  };

  const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: `calc(100vh - 115px)`,
    objectFit: 'contain',
  };

  return (
    <Spin spinning={isLoading} percent={loadingPercent} tip={loadingTip} size="large" delay={300}>
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Space.Compact>
          <ImageSelect onChange={e => void handleFileChange(e)}>Select photo</ImageSelect>
          {noBgImageUrl && (
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Save
            </Button>
          )}
        </Space.Compact>
      </div>
      <div style={{}}>
        {
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
        }
      </div>
    </Spin>
  );
};
