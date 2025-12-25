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
import {TAB_LABELS} from '~/src/components/messages';
import {TabContext} from '~/src/contexts/TabContext';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

export const EmptyImage: React.FC = () => {
  const tab: TabKey = useContext(TabContext);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[tab]);
  const photoLabel: string = t(TAB_LABELS[TabKey.Photo]);

  return (
    <div style={{padding: '0 16px 16px'}}>
      <Typography.Paragraph>
        <Typography.Text strong>
          <Trans>To use the {tabLabel} feature, select a reference photo.</Trans>
        </Typography.Text>
        <br />

        <ol>
          <li>
            <Trans>
              Go to the{' '}
              <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.Photo)}>
                {photoLabel}
              </Typography.Link>{' '}
              tab and choose your reference photo.
            </Trans>
          </li>
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
