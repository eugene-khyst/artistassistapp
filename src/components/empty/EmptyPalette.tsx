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

import {Col, Row, Typography} from 'antd';

import {AdCard} from '~/src/components/ad/AdCard';
import {useAppStore} from '~/src/stores/app-store';
import {TAB_LABELS, TabKey} from '~/src/tabs';

export const EmptyPalette: React.FC = () => {
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  return (
    <div style={{padding: '0 16px 16px'}}>
      <Typography.Paragraph>
        <Typography.Text strong>⁉️ No data</Typography.Text>
        <br />

        <Typography.Text strong>
          There is one common palette and a separate palette for each photo.
        </Typography.Text>
        <br />

        <Typography.Text strong>Add color mixtures to the palette:</Typography.Text>
        <br />

        <ol>
          <li>
            Go to the{' '}
            <Typography.Link strong onClick={() => void setActiveTabKey(TabKey.ColorPicker)}>
              {TAB_LABELS[TabKey.ColorPicker]}
            </Typography.Link>{' '}
            tab.
          </li>
          <li>
            Click 🖱️ or tap 👆 anywhere in the image, or use the color picker pop-up to choose a
            target color to mix from your colors.
          </li>
          <li>
            Press the <Typography.Text strong>Add to palette</Typography.Text> button next to the
            color mixture you like.
          </li>
          <li>
            Return to the <Typography.Text strong>{TAB_LABELS[TabKey.Palette]}</Typography.Text>{' '}
            tab.
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
