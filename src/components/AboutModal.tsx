/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BugOutlined,
  CommentOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import {Button, Col, Modal, Row, Space} from 'antd';
import {Dispatch, SetStateAction} from 'react';
import {Logo} from './Logo';

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export const AboutModal: React.FC<Props> = ({open, setOpen}: Props) => {
  return (
    <Modal title="ArtistAssistApp" open={open} footer={null} onCancel={() => setOpen(false)}>
      <Space direction="vertical" align="center" size="small" style={{width: '100%'}}>
        <Logo name tagline />
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Space direction="vertical" align="start" size={0}>
              <Button
                type="link"
                href="https://artistassistapp.com/tutorials/"
                target="_blank"
                icon={<ReadOutlined />}
                size="large"
              >
                Tutorials
              </Button>
              <Button
                type="link"
                href="https://github.com/eugene-khyst/artistassistapp/discussions"
                target="_blank"
                icon={<CommentOutlined />}
                size="large"
              >
                Questions and discussions
              </Button>
              <Button
                type="link"
                href="https://github.com/eugene-khyst/artistassistapp/issues"
                target="_blank"
                icon={<BugOutlined />}
                size="large"
              >
                Bugs and feature requests
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" align="start" size={0}>
              <Button
                type="link"
                href="https://artistassistapp.com/about/"
                target="_blank"
                icon={<InfoCircleOutlined />}
                size="large"
              >
                About ArtistAssistApp
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
              <Button
                type="link"
                href="https://artistassistapp.com/privacy-policy/"
                target="_blank"
                icon={<FileProtectOutlined />}
                size="large"
              >
                Privacy policy
              </Button>
              <Button
                type="link"
                href="https://artistassistapp.com/terms-of-use/"
                target="_blank"
                icon={<FileTextOutlined />}
                size="large"
              >
                Terms of use
              </Button>
            </Space>
          </Col>
        </Row>
      </Space>
    </Modal>
  );
};
