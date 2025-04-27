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

import {BgColorsOutlined, DeleteOutlined, PictureOutlined} from '@ant-design/icons';
import {Button, Card, Popconfirm, Space, Typography} from 'antd';

import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import type {ColorMixture} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

interface Props {
  colorMixture: ColorMixture;
}

export const PaletteColorMixtureCard: React.FC<Props> = ({colorMixture}: Props) => {
  const saveToPalette = useAppStore(state => state.saveToPalette);
  const deleteFromPalette = useAppStore(state => state.deleteFromPalette);
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);
  const setColorPickerPipet = useAppStore(state => state.setColorPickerPipet);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const handleTitleEdited = (value: string) => {
    void saveToPalette({...colorMixture, name: value});
  };

  const handleShowOnPhotoClick = () => {
    const {samplingArea} = colorMixture;
    if (samplingArea) {
      setColorPickerPipet(samplingArea);
      void setActiveTabKey(TabKey.ColorPicker);
    }
  };

  const handleSetAsBgClick = () => {
    void setBackgroundColor(colorMixture.layerRgb);
    void setActiveTabKey(TabKey.ColorPicker);
  };

  return (
    <Card size="small" variant="borderless">
      <Space direction="vertical" style={{width: '100%'}}>
        <Typography.Text
          editable={{
            text: colorMixture.name ?? '',
            onChange: handleTitleEdited,
            autoSize: false,
          }}
          style={{width: '100%', fontWeight: 'bold'}}
        >
          {colorMixture.name || 'Untitled mixture'}
        </Typography.Text>

        <ColorMixtureDescription colorMixture={colorMixture} />

        <Space wrap>
          <Button
            size="small"
            icon={<PictureOutlined />}
            onClick={handleShowOnPhotoClick}
            disabled={!colorMixture.samplingArea}
          >
            Show on photo
          </Button>
          <Button
            size="small"
            icon={<BgColorsOutlined />}
            title="Set the color of the base layer for the glazing"
            onClick={handleSetAsBgClick}
          >
            Set as background
          </Button>
          <Popconfirm
            title="Remove the color mixture"
            description="Are you sure you want to remove this color mixture?"
            onConfirm={() => void deleteFromPalette(colorMixture)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" icon={<DeleteOutlined />}>
              Remove
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    </Card>
  );
};
