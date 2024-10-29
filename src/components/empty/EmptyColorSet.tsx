/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Row, Typography} from 'antd';
import {useContext} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {TabContext} from '~/src/contexts/TabContext';
import {useAppStore} from '~/src/stores/app-store';
import {TAB_LABELS, TabKey} from '~/src/tabs';

type Props = {
  feature: string;
  imageSupported?: boolean;
  imageMandatory?: boolean;
  pencilsSupported?: boolean;
};

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
