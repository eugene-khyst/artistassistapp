/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Typography} from 'antd';

export const EmptyPalette: React.FC = () => {
  return (
    <Typography.Paragraph>
      <Typography.Text strong>⁉️ No data</Typography.Text>
      <br />
      <Typography.Text strong>
        There is one common palette and a separate palette for each photo.
      </Typography.Text>
      <br />
      <Typography.Text strong>To use the palette features, add color mixtures:</Typography.Text>
      <ol>
        <li>
          Go to the <Typography.Text code>Color picker</Typography.Text> tab.
        </li>
        <li>
          Click 🖱️ or tap 👆 anywhere in the image, or use the color picker pop-up to choose a
          target color to mix from your colors.
        </li>
        <li>
          Press the <Typography.Text code>Add to palette</Typography.Text> button next to the color
          mixture you like.
        </li>
        <li>
          Return to the <Typography.Text code>Palette</Typography.Text> tab.
        </li>
      </ol>
    </Typography.Paragraph>
  );
};
