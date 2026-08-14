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
import {Alert, Col, Row, Steps, Typography} from 'antd';

import {AdCard} from '@/components/ad/AdCard';
import {GoToTabButton} from '@/components/button/GoToTabButton';
import {TAB_LABELS} from '@/components/messages';
import {TabKey} from '@/tabs';

export function EmptyPalette() {
  const {t} = useLingui();

  const tabLabel: string = t(TAB_LABELS[TabKey.Palette]);

  return (
    <div className="u-tab-content">
      <Typography.Paragraph strong>
        <Trans>Add color mixtures to the palette</Trans>
      </Typography.Paragraph>

      <Steps
        orientation="vertical"
        size="small"
        className="u-mb"
        items={[
          {
            title: <Trans>Pick a target color</Trans>,
            content: (
              <Trans>
                Click 🖱️ or tap 👆 anywhere in the photo, or use the color picker pop-up to choose a
                target color to mix from your colors
              </Trans>
            ),
          },
          {
            title: <Trans>Add a color mixture to the palette</Trans>,
            content: (
              <Trans>
                Press the <Typography.Text strong>Add to palette</Typography.Text> button next to
                the color mixture you like
              </Trans>
            ),
          },
          {title: <Trans>Return to the {tabLabel} tab</Trans>},
        ]}
      />

      <GoToTabButton tab={TabKey.ColorPicker} type="primary" className="u-mb" />

      <Alert
        type="info"
        showIcon
        title={<Trans>There is one common palette and a separate palette for each photo</Trans>}
        className="u-w-fit u-mb"
      />

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </div>
  );
}
