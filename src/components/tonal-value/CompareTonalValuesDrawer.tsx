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

import {Trans} from '@lingui/react/macro';
import {Drawer, Flex, Typography} from 'antd';
import {useState} from 'react';

import {PhotoPicker} from '@/components/file/PhotoPicker';
import {useAppStore} from '@/stores/app-store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CompareTonalValuesDrawer({open, onClose}: Readonly<Props>) {
  const isComparisonTonalImagesLoading = useAppStore(state => state.isComparisonTonalImagesLoading);
  const loadComparisonTonalImages = useAppStore(state => state.loadComparisonTonalImages);

  const [photoError, setPhotoError] = useState(false);

  const selectPhoto = async ([file]: File[]): Promise<void> => {
    if (!file) {
      return;
    }
    setPhotoError(false);
    try {
      if (await loadComparisonTonalImages(file)) {
        onClose();
      }
    } catch (error) {
      console.error('Could not compare the painting photo', error);
      setPhotoError(true);
    }
  };

  return (
    <Drawer
      title={<Trans>Compare tonal values</Trans>}
      open={open}
      placement="right"
      size="default"
      onClose={onClose}
      afterOpenChange={isOpen => {
        if (!isOpen) {
          setPhotoError(false);
        }
      }}
    >
      <Flex vertical gap="middle">
        <Typography.Text>
          <Trans>
            Take a photo of your painting to compare its tonal values with the reference photo. Use
            even light with no shadows or glare.
          </Trans>
        </Typography.Text>
        <PhotoPicker
          loading={isComparisonTonalImagesLoading}
          error={photoError}
          onChange={selectPhoto}
        />
      </Flex>
    </Drawer>
  );
}
