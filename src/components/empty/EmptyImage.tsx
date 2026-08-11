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
import {Col, Row, Steps, Typography} from 'antd';
import {use} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {GoToTabButton} from '@/components/button/GoToTabButton';
import {TAB_LABELS} from '@/components/messages';
import {TabContext} from '@/contexts/TabContext';
import {TabKey} from '@/tabs';

export function EmptyImage() {
  const tab: TabKey = use(TabContext);

  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[tab]);

  return (
    <div className="u-tab-content">
      <Typography.Paragraph strong>
        <Trans>To use the {tabLabel} feature, select a reference photo.</Trans>
      </Typography.Paragraph>

      <Steps
        orientation="vertical"
        size="small"
        className="u-mb"
        items={[
          {title: <Trans>Choose a reference photo</Trans>},
          {title: <Trans>Return to the {tabLabel} tab</Trans>},
        ]}
      />

      <GoToTabButton tab={TabKey.Photo} type="primary" className="u-mb" />

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </div>
  );
}
