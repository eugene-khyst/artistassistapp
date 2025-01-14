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

import {Card} from 'antd';

import {blobToImageFile} from '~/src/services/image/image-file';
import {useAppStore} from '~/src/stores/app-store';

interface Props {
  image: string | URL;
  thumbnail?: string | URL;
  name: string;
  setLoadingCount: (value: (prevCount: number) => number) => void;
}

export const SampleImageCard: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setLoadingCount,
}: Props) => {
  const setImageFile = useAppStore(state => state.setImageFile);

  const handleCardClick = () => {
    void (async () => {
      setLoadingCount((prev: number) => prev + 1);
      const response: Response = await fetch(image);
      const blob: Blob = await response.blob();
      void setImageFile(await blobToImageFile(blob));
      setLoadingCount((prev: number) => prev - 1);
    })();
  };

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      cover={<img src={thumbnail?.toString() ?? image.toString()} alt={name} loading="lazy" />}
    >
      <Card.Meta title={name} />
    </Card>
  );
};
