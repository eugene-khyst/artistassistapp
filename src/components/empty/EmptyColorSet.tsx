/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Typography} from 'antd';

type Props = {
  feature: string;
  tab: string;
  imageSupported?: boolean;
  imageMandatory?: boolean;
  pencilsSupported?: boolean;
};

export const EmptyColorSet: React.FC<Props> = ({
  feature,
  tab,
  imageSupported = false,
  imageMandatory = false,
  pencilsSupported = true,
}: Props) => {
  return (
    <Typography.Paragraph>
      <Typography.Text strong>⁉️ No data</Typography.Text>
      <br />
      <Typography.Text strong>
        To use the {feature} features, select colors to paint with:
      </Typography.Text>
      <ol>
        <li>
          Go to the <Typography.Text code>Color set</Typography.Text> tab.
        </li>
        <li>
          Select your medium{!pencilsSupported && ' other than pencils'}, color brands and colors
          you will paint with and press the <Typography.Text code>Save & proceed</Typography.Text>{' '}
          button.
        </li>
        {(imageSupported || imageMandatory) && (
          <li>
            {imageMandatory ? 'Go to' : 'Optionally, go to'} the{' '}
            <Typography.Text code>Photo</Typography.Text> tab and choose your reference photo.
          </li>
        )}
        <li>
          Return to the <Typography.Text code>{tab}</Typography.Text> tab.
        </li>
      </ol>
    </Typography.Paragraph>
  );
};
