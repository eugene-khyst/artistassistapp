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

import {CloudDownloadOutlined, DeleteOutlined, FileImageOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Card, Popconfirm} from 'antd';
import dayjs from 'dayjs';
import {useState} from 'react';

import {LoadingButton} from '@/components/button/LoadingButton';
import {DATE_TIME_FORMAT} from '@/config';
import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import type {RecentImage} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';

import styles from './RecentImageCard.module.css';

const RESTORE_NOTIFICATION_KEY = 'restore-recent-image';

interface Props {
  image: RecentImage;
}

export function RecentImageCard({image}: Readonly<Props>) {
  const selectRecentImage = useAppStore(state => state.selectRecentImage);
  const deleteRecentImage = useAppStore(state => state.deleteRecentImage);
  const repairImage = useAppStore(state => state.repairImage);
  const cloudConnection = useAppStore(state => state.cloudConnection);

  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  const {t} = useLingui();
  const {notification} = App.useApp();

  const imageUrl: string | undefined = useCreateObjectUrl(image.blob);

  const {name, date, digest} = image;
  const dateText: string = dayjs(date).format(DATE_TIME_FORMAT);
  const unavailable = !image.blob || (imageUrl !== undefined && failedImageUrl === imageUrl);

  const handleCardClick = () => {
    void selectRecentImage(image);
  };

  const handleDeleteButtonClick = () => {
    void deleteRecentImage(digest);
  };

  const handleRestore = async () => {
    if ((await repairImage(digest)) === 'unavailable') {
      notification.warning({
        key: RESTORE_NOTIFICATION_KEY,
        title: <Trans>Photo not restored</Trans>,
        description: <Trans>This photo could not be restored from your cloud storage.</Trans>,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  };

  return (
    <Card
      hoverable={!unavailable}
      onClick={unavailable ? undefined : handleCardClick}
      cover={
        unavailable ? (
          <div className={styles['unavailableCover']}>
            <FileImageOutlined aria-hidden />
            {cloudConnection ? (
              <>
                <Trans>
                  Photo unavailable. Restore it from your cloud storage, or select the original
                  again.
                </Trans>
                <LoadingButton icon={<CloudDownloadOutlined />} type="primary" run={handleRestore}>
                  <Trans>Restore from cloud</Trans>
                </LoadingButton>
              </>
            ) : (
              <Trans>Photo unavailable. Select the original again to repair it.</Trans>
            )}
          </div>
        ) : !imageUrl ? (
          <div className={styles['loadingCover']} />
        ) : (
          <img
            src={imageUrl}
            alt={name}
            onError={() => {
              setFailedImageUrl(imageUrl);
            }}
          />
        )
      }
      actions={[
        <Popconfirm
          key="delete"
          title={<Trans>Delete the recent photo</Trans>}
          description={<Trans>Are you sure you want to delete this photo?</Trans>}
          onPopupClick={e => {
            e.stopPropagation();
          }}
          onConfirm={e => {
            e?.stopPropagation();
            handleDeleteButtonClick();
          }}
          onCancel={e => e?.stopPropagation()}
          okText={<Trans>Delete</Trans>}
          cancelText={<Trans>Keep</Trans>}
        >
          <Button
            icon={<DeleteOutlined />}
            title={t`Delete the recent photo`}
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </Popconfirm>,
      ]}
    >
      <Card.Meta title={name} description={t`Last used ${dateText}`} />
    </Card>
  );
}
