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

import {Trans, useLingui} from '@lingui/react/macro';
import {Col, Row, Typography} from 'antd';
import {useContext} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {COLOR_TYPE_LABELS, TAB_LABELS} from '~/src/components/messages';
import {TabContext} from '~/src/contexts/TabContext';
import type {ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

interface Props {
  imageSupported?: boolean;
  imageMandatory?: boolean;
  supportedColorTypes?: ColorType[];
}

export const EmptyColorSet: React.FC<Props> = ({
  imageSupported = false,
  imageMandatory = false,
  supportedColorTypes,
}: Props) => {
  const tab: TabKey = useContext(TabContext);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[tab]);
  const colorSetLabel: string = t(TAB_LABELS[TabKey.ColorSet]);
  const photoLabel: string = t(TAB_LABELS[TabKey.Photo]);

  return (
    <div style={{padding: '0 16px 16px'}}>
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
              Select your art medium, color brands and colors you will paint with and press the{' '}
              <Typography.Text strong>Save & proceed</Typography.Text> button.
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
};
