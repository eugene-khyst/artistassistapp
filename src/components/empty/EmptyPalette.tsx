/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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

        <Typography.Text strong>To use the palette features, add color mixtures:</Typography.Text>
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
