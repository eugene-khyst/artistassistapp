/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {MailOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {Button, Col, Modal, Row} from 'antd';
import {Dispatch, SetStateAction} from 'react';
import {Logo} from './Logo';

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export const AboutModal: React.FC<Props> = ({open, setOpen}: Props) => {
  return (
    <Modal title="ArtistAssistApp" open={open} footer={null} onCancel={() => setOpen(false)}>
      <div style={{textAlign: 'center'}}>
        <Logo name={true} tagline={true} />
        <Row>
          <Col xs={12}>
            <Button
              type="link"
              href="https://artistassistapp.com/docs/"
              target="_blank"
              icon={<QuestionCircleOutlined />}
              size="large"
            >
              Documentation
            </Button>
            <Button
              type="link"
              href="https://artistassistapp.com/contact/"
              target="_blank"
              icon={<MailOutlined />}
              size="large"
            >
              Contact
            </Button>
          </Col>
          <Col xs={12}>
            <Button
              type="link"
              href="https://artistassistapp.com/privacy-policy/"
              target="_blank"
              size="large"
            >
              Privacy policy
            </Button>
            <Button
              type="link"
              href="https://artistassistapp.com/terms-of-use/"
              target="_blank"
              size="large"
            >
              Terms of use
            </Button>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
