/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Typography} from 'antd';

type Props = {
  feature: string;
  tab: string;
  photoSupported?: boolean;
  photoMandatory?: boolean;
  pencilsSupported?: boolean;
};

export const EmptyPaintSet: React.FC<Props> = ({
  feature,
  tab,
  photoSupported = false,
  photoMandatory = false,
  pencilsSupported = true,
}: Props) => {
  return (
    <Typography.Paragraph>
      <Typography.Text strong>⁉️ No data</Typography.Text>
      <br />
      To use the {feature} features, select colors to paint with:
      <ol>
        <li>
          Go to the <Typography.Text keyboard>Color set</Typography.Text> tab.
        </li>
        <li>
          Select your medium{!pencilsSupported && ' other than pencils'}, color brands and colors
          you will paint with and press the{' '}
          <Typography.Text keyboard>Save & proceed</Typography.Text> button.
        </li>
        {(photoSupported || photoMandatory) && (
          <li>
            {photoMandatory ? 'Go to' : 'Optionally, go to'} the{' '}
            <Typography.Text keyboard>Photo</Typography.Text> tab and choose your reference photo.
          </li>
        )}
        <li>
          Return to the <Typography.Text keyboard>{tab}</Typography.Text> tab.
        </li>
      </ol>
    </Typography.Paragraph>
  );
};
