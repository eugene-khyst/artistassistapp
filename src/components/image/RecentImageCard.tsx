/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DeleteOutlined} from '@ant-design/icons';
import {Button, Card, Popconfirm} from 'antd';
import * as dayjs from 'dayjs';

import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import type {ImageFile} from '~/src/services/db';
import {useAppStore} from '~/src/stores/app-store';

type Props = {
  imageFile: ImageFile;
};

export const RecentImageCard: React.FC<Props> = ({imageFile}: Props) => {
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const deleteRecentImageFile = useAppStore(state => state.deleteRecentImageFile);

  const {file, date} = imageFile;
  const imageSrc: string | undefined = useCreateObjectUrl(file);
  const dateStr: string | undefined = date && dayjs(date).format('DD/MM/YYYY');

  const handleCardClick = () => {
    void saveRecentImageFile(imageFile);
  };

  const handleDeleteButtonClick = () => {
    void deleteRecentImageFile(imageFile);
  };

  return (
    imageSrc && (
      <Card
        hoverable
        onClick={handleCardClick}
        cover={<img src={imageSrc} alt={file.name} />}
        actions={[
          <Popconfirm
            key="delete"
            title="Delete the recent photo"
            description="Are you sure you want to delete this recent photo?"
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
        <Card.Meta title={file.name} description={`Loaded on ${dateStr}`} />
      </Card>
    )
  );
};
