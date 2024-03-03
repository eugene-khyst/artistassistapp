/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Typography} from 'antd';

type Props = {
  feature: string;
  tab: string;
};

export const EmptyImage: React.FC<Props> = ({feature, tab}: Props) => {
  return (
    <Typography.Paragraph>
      <Typography.Text strong>⁉️ No data</Typography.Text>
      <br />
      <Typography.Text strong>To {feature}, select a reference photo:</Typography.Text>
      <ol>
        <li>
          Go to the <Typography.Text code>Photo</Typography.Text> tab and choose your reference
          photo.
        </li>
        <li>
          Return to the <Typography.Text code>{tab}</Typography.Text> tab.
        </li>
      </ol>
    </Typography.Paragraph>
  );
};
