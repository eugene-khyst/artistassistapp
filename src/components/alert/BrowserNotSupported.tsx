/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AndroidOutlined,
  AppleOutlined,
  ChromeOutlined,
  DesktopOutlined,
  LinuxOutlined,
  MobileOutlined,
  TabletOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import {Alert, Typography} from 'antd';
import {prettyUserAgent, userAgent} from '../../utils/user-agent';

type Props = {
  browserFeatures: Record<string, boolean>;
};

export const BrowserNotSupported: React.FC<Props> = ({browserFeatures}: Props) => {
  const browserFeaturesListItems = Object.entries(browserFeatures).map(
    ([feature, isSupported]) => `${feature} ${isSupported ? '✔️' : '❗'}`
  );

  return (
    <div style={{padding: 16}}>
      <Alert
        message={`Your web browser ${prettyUserAgent} is not supported.`}
        type="error"
        showIcon
      />
      <Typography.Title level={2}>Supported web browsers and operating systems</Typography.Title>
      <Typography.Paragraph>
        <ul>
          <li>
            <TabletOutlined /> Tablet and <MobileOutlined /> Mobile
            <li>
              <AppleOutlined /> iPadOS 16.4+ or iOS 16.4+ (not supported in any browser on older
              versions of iPadOS and iOS)
            </li>
            <li>
              <AndroidOutlined /> Android
              <ul>
                <li>Chrome 69+</li>
                <li>Firefox 105+</li>
                <li>Opera 73+</li>
                <li>Samsung Internet 10.1+</li>
              </ul>
            </li>
          </li>
          <li>
            <DesktopOutlined /> Desktop
            <ul>
              <li>
                <AppleOutlined /> macOS
                <ul>
                  <li>
                    Safari 16.4 (macOS Big Sur, macOS Monterey, macOS Ventura or later required)
                  </li>
                  <li>or install the latest version of Chrome, Edge, Firefox or Opera</li>
                </ul>
              </li>
              <li>
                <WindowsOutlined /> Windows and <LinuxOutlined /> Linux
                <ul>
                  <li>Chrome 69+</li>
                  <li>Edge 79+</li>
                  <li>Firefox 105+</li>
                  <li>Opera 64+</li>
                </ul>
              </li>
              <li>
                <ChromeOutlined /> ChromeOS 69+
              </li>
            </ul>
          </li>
        </ul>
      </Typography.Paragraph>
      <Typography.Title level={2}>Diagnostics</Typography.Title>
      <Typography.Paragraph>{userAgent}</Typography.Paragraph>
      <Typography.Paragraph>
        <ul>
          {browserFeaturesListItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Typography.Paragraph>
    </div>
  );
};
