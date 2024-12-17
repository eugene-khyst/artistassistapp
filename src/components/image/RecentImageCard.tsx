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

import {DeleteOutlined} from '@ant-design/icons';
import {Button, Card, Popconfirm} from 'antd';
import dayjs from 'dayjs';

import {useCreateObjectUrl} from '~/src/hooks';
import {useImageFileToBlob} from '~/src/hooks/useImageFileToBlob';
import type {ImageFile} from '~/src/services/image';
import {useAppStore} from '~/src/stores/app-store';

interface Props {
  imageFile: ImageFile;
}

export const RecentImageCard: React.FC<Props> = ({imageFile}: Props) => {
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const deleteRecentImageFile = useAppStore(state => state.deleteRecentImageFile);

  const {name, date} = imageFile;

  const blob = useImageFileToBlob(imageFile);
  const imageUrl: string | undefined = useCreateObjectUrl(blob);
  const dateStr: string | undefined = date && dayjs(date).format('DD/MM/YYYY HH:mm');

  const handleCardClick = () => {
    void saveRecentImageFile({...imageFile});
  };

  const handleDeleteButtonClick = () => {
    void deleteRecentImageFile(imageFile);
  };

  return (
    imageUrl && (
      <Card
        hoverable
        onClick={handleCardClick}
        cover={<img src={imageUrl} alt={name} />}
        actions={[
          <Popconfirm
            key="delete"
            title="Delete the recent photo"
            description="Are you sure you want to delete this photo?"
            onPopupClick={e => {
              e.stopPropagation();
            }}
            onConfirm={e => {
              e?.stopPropagation();
              handleDeleteButtonClick();
            }}
            onCancel={e => e?.stopPropagation()}
            okText="Yes"
            cancelText="No"
          >
            <Button
              icon={<DeleteOutlined />}
              title="Delete the recent photo"
              onClick={e => {
                e.stopPropagation();
              }}
            >
              Delete
            </Button>
          </Popconfirm>,
        ]}
      >
        <Card.Meta title={name} description={`Last used ${dateStr}`} />
      </Card>
    )
  );
};
