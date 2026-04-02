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

import {Card} from 'antd';

import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import {useAppStore} from '~/src/stores/app-store';
import {splitUrl} from '~/src/utils/url';

interface Props {
  sampleImage: SampleImageDefinition;
}

export const SampleImageCard: React.FC<Props> = ({sampleImage}: Props) => {
  const loadSampleImage = useAppStore(state => state.loadSampleImage);

  const [baseUrl, filename] = splitUrl(new URL(sampleImage.image));
  const thumbnail = `${baseUrl}thumbnails/${filename}`;

  return (
    <Card
      hoverable
      onClick={() => {
        void loadSampleImage(sampleImage);
      }}
      cover={<img src={thumbnail} alt={sampleImage.name} crossOrigin="anonymous" loading="lazy" />}
    >
      <Card.Meta title={sampleImage.name} />
    </Card>
  );
};
