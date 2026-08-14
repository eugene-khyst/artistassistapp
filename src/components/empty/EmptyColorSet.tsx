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

import {LoadingOutlined} from '@ant-design/icons';
import type {ColorType} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Result, Row, Space, Spin, Steps, Tag, Typography} from 'antd';
import {use} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {GoToTabButton} from '@/components/button/GoToTabButton';
import {COLOR_TYPE_LABELS, TAB_LABELS} from '@/components/messages';
import {TabContext} from '@/contexts/TabContext';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

interface Props {
  imageSupported?: boolean;
  imageMandatory?: boolean;
  supportedColorTypes?: readonly ColorType[];
}

export function EmptyColorSet({
  imageSupported = false,
  imageMandatory = false,
  supportedColorTypes,
}: Readonly<Props>) {
  const isColorSetActivationLoading = useAppStore(state => state.isColorSetActivationLoading);
  const colorSetActivationError = useAppStore(state => state.colorSetActivationError);

  const activateLatestColorSet = useAppStore(state => state.activateLatestColorSet);

  const tab: TabKey = use(TabContext);

  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[tab]);
  const imageStep: boolean = imageSupported || imageMandatory;

  if (isColorSetActivationLoading) {
    return (
      <div className="u-tab-content">
        <Result
          icon={<Spin size="large" indicator={<LoadingOutlined spin />} />}
          title={<Trans>Restoring the saved color set</Trans>}
        />
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
      <Typography.Paragraph strong>
        <Trans>
          To use the {tabLabel} feature, select supported art medium and colors to paint with
        </Trans>
      </Typography.Paragraph>

      <Steps
        orientation="vertical"
        size="small"
        className="u-mb"
        items={[
          {
            title: <Trans>Select your art medium, color brands, and colors</Trans>,
            content: (
              <>
                {supportedColorTypes && (
                  <>
                    <Trans>Supported art mediums:</Trans>{' '}
                    <Space size="small" wrap>
                      {supportedColorTypes.map((colorType: ColorType) => (
                        <Tag key={colorType}>{t(COLOR_TYPE_LABELS[colorType])}</Tag>
                      ))}
                    </Space>
                    <br />
                  </>
                )}
                <Trans>
                  Press <Typography.Text strong>Save & continue</Typography.Text> when done.
                </Trans>
              </>
            ),
          },
          ...(imageStep
            ? [
                {
                  title: <Trans>Choose a reference photo</Trans>,
                  content: imageMandatory ? undefined : <Trans>This step is optional</Trans>,
                },
              ]
            : []),
          {
            title: <Trans>Return to the {tabLabel} tab</Trans>,
          },
        ]}
      />

      <Space wrap className="u-mb">
        <GoToTabButton tab={TabKey.ColorSet} type="primary" />
        {imageStep && <GoToTabButton tab={TabKey.Photo} />}
      </Space>

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </div>
  );
}
