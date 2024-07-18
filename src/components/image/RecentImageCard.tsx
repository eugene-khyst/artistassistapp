/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DeleteOutlined} from '@ant-design/icons';
import {Button, Card, Popconfirm} from 'antd';
import * as dayjs from 'dayjs';

import {useCreateObjectUrl} from '~/src/hooks';
import {useImageFileToBlob} from '~/src/hooks/useImageFileToBlob';
import type {ImageFile} from '~/src/services/image';
import {useAppStore} from '~/src/stores/app-store';

type Props = {
  imageFile: ImageFile;
};

export const RecentImageCard: React.FC<Props> = ({imageFile}: Props) => {
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const deleteRecentImageFile = useAppStore(state => state.deleteRecentImageFile);

  const {name, date} = imageFile;

  const blob = useImageFileToBlob(imageFile);
  const imageSrc: string | undefined = useCreateObjectUrl(blob);
  const dateStr: string | undefined = date && dayjs(date).format('DD/MM/YYYY HH:mm');

  const handleCardClick = () => {
    void saveRecentImageFile({...imageFile});
  };

  const handleDeleteButtonClick = () => {
    void deleteRecentImageFile(imageFile);
  };

  return (
    imageSrc && (
      <Card
        hoverable
        onClick={handleCardClick}
        cover={<img src={imageSrc} alt={name} />}
        actions={[
          <Popconfirm
            key="delete"
            title="Delete the recent photo"
            description="Are you sure you want to delete this photo?"
            onPopupClick={e => e.stopPropagation()}
            onConfirm={e => {
              e?.stopPropagation();
              handleDeleteButtonClick();
            }}
            onCancel={e => e?.stopPropagation()}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} onClick={e => e.stopPropagation()}>
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
