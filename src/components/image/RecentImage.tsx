/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DeleteOutlined} from '@ant-design/icons';
import {Button, Card, Popconfirm} from 'antd';
import * as dayjs from 'dayjs';
import {Dispatch, SetStateAction} from 'react';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {ImageFile} from '~/src/services/db';

type Props = {
  imageFile: ImageFile;
  deleteRecentImage: (id?: number) => void;
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  setImageFileId: Dispatch<SetStateAction<number | undefined>>;
};

export const RecentImage: React.FC<Props> = ({
  imageFile: {id, file, date},
  deleteRecentImage,
  setBlob,
  setImageFileId,
}: Props) => {
  const imageSrc: string | undefined = useCreateObjectUrl(file);
  const dateStr: string | undefined = date && dayjs(date).format('DD/MM/YYYY');

  const handleCardClick = async () => {
    setBlob(file);
    setImageFileId(id);
  };

  const handleDeleteButtonClick = () => {
    deleteRecentImage(id);
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
