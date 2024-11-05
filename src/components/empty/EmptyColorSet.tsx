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

import {Col, Row, Typography} from 'antd';
import {useContext} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {TabContext} from '~/src/contexts/TabContext';
import {useAppStore} from '~/src/stores/app-store';
import {TAB_LABELS, TabKey} from '~/src/tabs';

interface Props {
  feature: string;
  imageSupported?: boolean;
  imageMandatory?: boolean;
  pencilsSupported?: boolean;
}

export const EmptyColorSet: React.FC<Props> = ({
  feature,
  imageSupported = false,
  imageMandatory = false,
  pencilsSupported = true,
}: Props) => {
  const tab: TabKey = useContext(TabContext);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  return (
    <div style={{padding: '0 16px 16px'}}>
      <Typography.Paragraph>
        <Typography.Text strong>⁉️ No data</Typography.Text>
        <br />

        <Typography.Text strong>
          To use the {feature} features, select colors to paint with:
        </Typography.Text>
        <br />

        <ol>
          <li>
            Go to the{' '}
            <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.ColorSet)}>
              {TAB_LABELS[TabKey.ColorSet]}
            </Typography.Link>{' '}
            tab.
          </li>
          <li>
            Select your medium{!pencilsSupported && ' other than pencils'}, color brands and colors
            you will paint with and press the{' '}
            <Typography.Text strong>Save & proceed</Typography.Text> button.
          </li>
          {(imageSupported || imageMandatory) && (
            <li>
              {imageMandatory ? 'Go to' : 'Optionally, go to'} the{' '}
              <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.Photo)}>
                {TAB_LABELS[TabKey.Photo]}
              </Typography.Link>{' '}
              tab and choose your reference photo.
            </li>
          )}
          <li>
            Return to the <Typography.Text strong>{TAB_LABELS[tab]}</Typography.Text> tab.
          </li>
        </ol>
      </Typography.Paragraph>

      <Row>
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </div>
  );
};
