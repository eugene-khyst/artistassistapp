/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CloseOutlined} from '@ant-design/icons';
import {useAuth0} from '@auth0/auth0-react';
import {Button, Modal} from 'antd';
import {type Dispatch, type SetStateAction, useEffect, useState} from 'react';

import {Ad} from '~/src/components/ad/Ad';
import {useAds} from '~/src/hooks';
import type {AdDefinition} from '~/src/services/ads';
import type {AppUser} from '~/src/services/auth';
import {MEMBERSHIP_CLAIM} from '~/src/services/auth';

const PLACEMENT = 'popup';
const DEFAULT_PLACEMENT = 'all';
const CLOSE_SECONDS = 5;

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export const AdModal: React.FC<Props> = ({open, setOpen}: Props) => {
  const {isLoading: isAuthLoading, isAuthenticated, user} = useAuth0<AppUser>();

  const {ads: {ads: allAds, placements} = {ads: {}, placements: {}}} = useAds();

  const [closeCounter, setCloseCounter] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setCloseCounter(CLOSE_SECONDS);
      const intervalId = setInterval(() => {
        setCloseCounter(prev => {
          const next = prev - 1;
          if (next === 0) {
            clearInterval(intervalId);
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [open]);

  const adKeys: string[] = placements[PLACEMENT] ?? placements[DEFAULT_PLACEMENT] ?? [];
  const ads: AdDefinition[] = adKeys
    .map((adKey: string): AdDefinition | undefined => allAds[adKey])
    .filter((ad): ad is AdDefinition => !!ad);

  if (isAuthLoading || (isAuthenticated && user?.[MEMBERSHIP_CLAIM]?.active) || !ads.length) {
    return <></>;
  }
  return (
    <Modal centered open={open} footer={null} closeIcon={null}>
      <Ad
        vertical
        ads={ads}
        footer={
          closeCounter > 0 ? (
            <Button loading>Close ad in {closeCounter} s</Button>
          ) : (
            <Button icon={<CloseOutlined />} onClick={() => setOpen(false)}>
              Close ad
            </Button>
          )
        }
        style={{paddingBottom: 0}}
      />
    </Modal>
  );
};
