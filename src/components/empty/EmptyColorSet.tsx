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

import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Result, Row, Spin, Typography} from 'antd';
import {use} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {COLOR_TYPE_LABELS, TAB_LABELS} from '@/components/messages';
import {TabContext} from '@/contexts/TabContext';
import type {ColorType} from '@/services/color/types';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

interface Props {
  imageSupported?: boolean;
  imageMandatory?: boolean;
  supportedColorTypes?: ColorType[];
}

export function EmptyColorSet({
  imageSupported = false,
  imageMandatory = false,
  supportedColorTypes,
}: Readonly<Props>) {
  const isColorSetActivationLoading = useAppStore(state => state.isColorSetActivationLoading);
  const colorSetActivationError = useAppStore(state => state.colorSetActivationError);

  const activateLatestColorSet = useAppStore(state => state.activateLatestColorSet);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const tab: TabKey = use(TabContext);

  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[tab]);
  const colorSetLabel: string = t(TAB_LABELS[TabKey.ColorSet]);
  const photoLabel: string = t(TAB_LABELS[TabKey.Photo]);

  if (isColorSetActivationLoading) {
    return (
      <div className="u-tab-content">
        <Result icon={<Spin size="large" />} title={<Trans>Restoring the saved color set</Trans>} />
      </div>
    );
  }

  if (colorSetActivationError) {
    return (
      <div className="u-tab-content">
        <Result
          status="warning"
          title={<Trans>Unable to restore the saved color set</Trans>}
          subTitle={
            <Trans>Color data is currently unavailable. Check your connection and try again.</Trans>
          }
          extra={
            <Button type="primary" onClick={() => void activateLatestColorSet()}>
              <Trans>Retry</Trans>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="u-tab-content">
      <Typography.Paragraph>
        <Typography.Text strong>
          <Trans>
            To use the {tabLabel} feature, select supported art medium and colors to paint with.
          </Trans>
        </Typography.Text>
        <br />

        <ol>
          <li>
            <Trans>
              Go to the{' '}
              <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.ColorSet)}>
                {colorSetLabel}
              </Typography.Link>{' '}
              tab.
            </Trans>
          </li>
          <li>
            <Trans>
              Select your art medium, color brands, and the colors you will paint with, then press{' '}
              <Typography.Text strong>Save & continue</Typography.Text>.
            </Trans>
            {supportedColorTypes && (
              <>
                <br />
                <Trans>Supported art mediums:</Trans>
                <ul>
                  {supportedColorTypes.map((colorType: ColorType) => (
                    <li key={colorType}>{t(COLOR_TYPE_LABELS[colorType])}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
          {(imageSupported || imageMandatory) && (
            <li>
              <Trans>
                Go to the{' '}
                <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.Photo)}>
                  {photoLabel}
                </Typography.Link>{' '}
                tab and choose a reference photo.
              </Trans>{' '}
              {!imageMandatory && <Trans>This step is optional.</Trans>}
            </li>
          )}
          <li>
            <Trans>
              Return to the <Typography.Text strong>{tabLabel}</Typography.Text> tab.
            </Trans>
          </li>
        </ol>
      </Typography.Paragraph>

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </div>
  );
}
