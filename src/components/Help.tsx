/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BugOutlined,
  CloudSyncOutlined,
  CommentOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import {Button, Col, Popconfirm, Row, Space, theme, Typography} from 'antd';
import {useState} from 'react';

import {commitHash, websiteUrl} from '~/src/config';
import {deleteDatabase} from '~/src/services/db';

import {Logo} from './image/Logo';

export const Help: React.FC = () => {
  const {
    token: {fontSizeSM, colorTextSecondary},
  } = theme.useToken();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleUpdateClick = async () => {
    if ('serviceWorker' in navigator) {
      setIsUpdating(true);
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      setIsUpdating(false);
    }
  };

  const handleDeleteAppData = () => {
    void deleteDatabase();
    window.location.reload();
  };

  return (
    <div style={{padding: '0 16px 16px'}}>
      <Space direction="vertical" align="center" size="small" style={{width: '100%'}}>
        <Logo name tagline />
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Space direction="vertical" align="start" size={0}>
              <Button
                type="link"
                href={`${websiteUrl}/tutorials/`}
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
                href={`${websiteUrl}`}
                target="_blank"
                icon={<InfoCircleOutlined />}
                size="large"
              >
                About ArtistAssistApp
              </Button>
              <Button
                type="link"
                href={`${websiteUrl}/contact/`}
                target="_blank"
                icon={<MailOutlined />}
                size="large"
              >
                Contact
              </Button>
              <Button
                type="link"
                href={`${websiteUrl}/privacy-policy/`}
                target="_blank"
                icon={<FileProtectOutlined />}
                size="large"
              >
                Privacy policy
              </Button>
              <Button
                type="link"
                href={`${websiteUrl}/terms-of-use/`}
                target="_blank"
                icon={<FileTextOutlined />}
                size="large"
              >
                Terms of use
              </Button>
            </Space>
          </Col>
        </Row>
        <Row>
          <Col xs={24}>
            <Space>
              <Button
                icon={<CloudSyncOutlined />}
                loading={isUpdating}
                onClick={() => void handleUpdateClick()}
              >
                Check for updates
              </Button>
              <Popconfirm
                title="Delete all app data"
                description="Are you sure you want to delete all app data?"
                onConfirm={() => {
                  void handleDeleteAppData();
                }}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />} danger>
                  Delete all app data
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
        <Row>
          <Col xs={24}>
            ArtistAssistApp is developed by{' '}
            <Typography.Link href="https://github.com/eugene-khyst" target="_blank">
              Eugene Khyst
            </Typography.Link>
          </Col>
        </Row>
        <Row>
          <Col xs={24} style={{fontSize: fontSizeSM, color: colorTextSecondary}}>
            App build hash: {commitHash}
          </Col>
        </Row>
      </Space>
    </div>
  );
};
