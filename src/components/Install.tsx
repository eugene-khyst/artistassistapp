/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {
  AndroidOutlined,
  AppleOutlined,
  AppstoreAddOutlined,
  ChromeOutlined,
  LinuxOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import {Button, Col, Collapse, Flex, Row, Space, theme, Typography} from 'antd';

interface Props {
  showInstallPromotion: boolean;
  promptToInstall: () => Promise<void>;
}

export const Install: React.FC<Props> = ({showInstallPromotion, promptToInstall}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  return (
    <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
      <Typography.Text strong>
        Install ArtistAssistApp on your device for easy access even without an Internet connection.
      </Typography.Text>

      <Row gutter={32}>
        <Col xs={24} md={8}>
          <Typography.Title level={4}>
            <AndroidOutlined /> Android, <WindowsOutlined /> Windows, <LinuxOutlined /> Linux and{' '}
            <ChromeOutlined /> ChromeOS
          </Typography.Title>
          <Button
            type="primary"
            icon={<AppstoreAddOutlined />}
            onClick={() => void promptToInstall()}
            disabled={!showInstallPromotion}
          >
            Install
          </Button>
          <Collapse
            ghost
            items={[
              {
                key: 1,
                label: 'Supported web browsers',
                children: (
                  <Typography.Paragraph>
                    <ul>
                      <li>
                        <AndroidOutlined /> Android
                        <ul>
                          <li>Chrome 76+</li>
                          <li>Opera 73+</li>
                          <li>Samsung Internet 10.1+</li>
                        </ul>
                      </li>
                      <li>
                        <WindowsOutlined /> Windows and <LinuxOutlined /> Linux
                        <ul>
                          <li>Chrome 76+</li>
                          <li>Edge 79+</li>
                          <li>Opera 64+</li>
                        </ul>
                      </li>
                      <li>
                        <ChromeOutlined /> ChromeOS 76+
                      </li>
                    </ul>
                  </Typography.Paragraph>
                ),
              },
            ]}
          />
        </Col>
        <Col xs={24} md={8}>
          <Typography.Title level={4}>
            <AppleOutlined /> iOS and iPadOS
          </Typography.Title>
          <Space direction="vertical">
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 20.283 19.932">
                <g fill={colorTextTertiary}>
                  <path d="M9.96 19.922c5.45 0 9.962-4.522 9.962-9.961C19.922 4.51 15.4 0 9.952 0 4.511 0 0 4.512 0 9.96c0 5.44 4.521 9.962 9.96 9.962Zm0-1.66A8.26 8.26 0 0 1 1.67 9.96c0-4.61 3.672-8.3 8.281-8.3 4.61 0 8.31 3.69 8.31 8.3 0 4.61-3.69 8.3-8.3 8.3Z" />
                  <path d="m5.87 14.883 5.605-2.735a1.47 1.47 0 0 0 .683-.673l2.725-5.596c.312-.664-.166-1.182-.85-.84L8.447 7.764c-.302.136-.508.341-.674.673L5.03 14.043c-.312.645.196 1.152.84.84Zm4.09-3.72A1.19 1.19 0 0 1 8.77 9.97c0-.664.527-1.201 1.19-1.201a1.2 1.2 0 0 1 1.202 1.2c0 .655-.537 1.192-1.201 1.192Z" />
                </g>
              </svg>
              Open in Safari browser
            </Space>
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 17.695 26.475">
                <g fill={colorTextTertiary}>
                  <path d="M17.334 10.762v9.746c0 2.012-1.025 3.027-3.066 3.027H3.066C1.026 23.535 0 22.52 0 20.508v-9.746C0 8.75 1.025 7.734 3.066 7.734h2.94v1.573h-2.92c-.977 0-1.514.527-1.514 1.543v9.57c0 1.015.537 1.543 1.514 1.543h11.152c.967 0 1.524-.527 1.524-1.543v-9.57c0-1.016-.557-1.543-1.524-1.543h-2.91V7.734h2.94c2.04 0 3.066 1.016 3.066 3.028Z" />
                  <path d="M8.662 15.889c.42 0 .781-.352.781-.762V5.097l-.058-1.464.654.693 1.484 1.582a.698.698 0 0 0 .528.235c.4 0 .713-.293.713-.694 0-.205-.088-.361-.235-.508l-3.3-3.183c-.196-.196-.362-.264-.567-.264-.195 0-.361.069-.566.264L4.795 4.94a.681.681 0 0 0-.225.508c0 .4.293.694.703.694.186 0 .4-.079.538-.235l1.474-1.582.664-.693-.058 1.465v10.029c0 .41.351.762.771.762Z" />
                </g>
              </svg>
              Press Share in Navigaton bar
            </Space>
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 25 25">
                <g fill={colorTextTertiary}>
                  <path d="M23.405 1.608C22.08.283 20.215.038 17.808.038H7.156c-2.336 0-4.202.245-5.527 1.57C.304 2.95.06 4.78.06 7.118V17.7c0 2.406.227 4.254 1.552 5.579 1.342 1.325 3.19 1.569 5.596 1.569h10.6c2.406 0 4.272-.244 5.597-1.57 1.325-1.342 1.552-3.172 1.552-5.578V7.187c0-2.406-.227-4.254-1.552-5.58zM23.02 6.82v11.245c0 1.517-.209 2.946-1.028 3.783-.837.837-2.302 1.064-3.818 1.064H6.842c-1.517 0-2.964-.227-3.8-1.064-.837-.837-1.047-2.266-1.047-3.783V6.873c0-1.552.21-3.016 1.03-3.853.836-.837 2.318-1.046 3.87-1.046h11.28c1.516 0 2.98.227 3.818 1.063.82.82 1.028 2.267 1.028 3.784zm-10.53 12.082c.645 0 1.029-.436 1.029-1.133v-4.342h4.533c.662 0 1.133-.366 1.133-.993 0-.645-.436-1.029-1.133-1.029H13.52V6.873c0-.697-.384-1.133-1.029-1.133-.628 0-.994.453-.994 1.133v4.533H6.982c-.698 0-1.151.384-1.151 1.029 0 .627.488.993 1.15.993h4.516v4.342c0 .662.366 1.133.994 1.133z" />
                </g>
              </svg>
              Press Add to Home Screen
            </Space>
            <Typography.Text>Requires iOS 16.4+ or iPadOS 16.4+.</Typography.Text>
          </Space>
        </Col>
        <Col xs={24} md={8}>
          <Typography.Title level={4}>
            <AppleOutlined /> macOS
          </Typography.Title>
          <Space direction="vertical">
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 20.283 19.932">
                <g fill={colorTextTertiary}>
                  <path d="M9.96 19.922c5.45 0 9.962-4.522 9.962-9.961C19.922 4.51 15.4 0 9.952 0 4.511 0 0 4.512 0 9.96c0 5.44 4.521 9.962 9.96 9.962Zm0-1.66A8.26 8.26 0 0 1 1.67 9.96c0-4.61 3.672-8.3 8.281-8.3 4.61 0 8.31 3.69 8.31 8.3 0 4.61-3.69 8.3-8.3 8.3Z" />
                  <path d="m5.87 14.883 5.605-2.735a1.47 1.47 0 0 0 .683-.673l2.725-5.596c.312-.664-.166-1.182-.85-.84L8.447 7.764c-.302.136-.508.341-.674.673L5.03 14.043c-.312.645.196 1.152.84.84Zm4.09-3.72A1.19 1.19 0 0 1 8.77 9.97c0-.664.527-1.201 1.19-1.201a1.2 1.2 0 0 1 1.202 1.2c0 .655-.537 1.192-1.201 1.192Z" />
                </g>
              </svg>
              Open in Safari browser
            </Space>
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 17.695 26.475">
                <g fill={colorTextTertiary}>
                  <path d="M17.334 10.762v9.746c0 2.012-1.025 3.027-3.066 3.027H3.066C1.026 23.535 0 22.52 0 20.508v-9.746C0 8.75 1.025 7.734 3.066 7.734h2.94v1.573h-2.92c-.977 0-1.514.527-1.514 1.543v9.57c0 1.015.537 1.543 1.514 1.543h11.152c.967 0 1.524-.527 1.524-1.543v-9.57c0-1.016-.557-1.543-1.524-1.543h-2.91V7.734h2.94c2.04 0 3.066 1.016 3.066 3.028Z" />
                  <path d="M8.662 15.889c.42 0 .781-.352.781-.762V5.097l-.058-1.464.654.693 1.484 1.582a.698.698 0 0 0 .528.235c.4 0 .713-.293.713-.694 0-.205-.088-.361-.235-.508l-3.3-3.183c-.196-.196-.362-.264-.567-.264-.195 0-.361.069-.566.264L4.795 4.94a.681.681 0 0 0-.225.508c0 .4.293.694.703.694.186 0 .4-.079.538-.235l1.474-1.582.664-.693-.058 1.465v10.029c0 .41.351.762.771.762Z" />
                </g>
              </svg>
              Press Share in Navigation bar
            </Space>
            <Space align="center">
              <svg width="1.5em" viewBox="0 0 23.389 17.979">
                <g fill={colorTextTertiary}>
                  <path d="M1.045 3.291v1.377h20.937V3.291Zm2.021 14.688h16.895c2.05 0 3.066-1.006 3.066-3.018V3.027C23.027 1.016 22.012 0 19.961 0H3.066C1.026 0 0 1.016 0 3.027v11.934c0 2.012 1.025 3.018 3.066 3.018Zm.02-1.573c-.977 0-1.514-.517-1.514-1.533V3.115c0-1.015.537-1.543 1.514-1.543H19.94c.967 0 1.514.528 1.514 1.543v11.758c0 1.016-.547 1.533-1.514 1.533Z" />
                  <path d="M4.2 14.014c0 .508.35.85.868.85h12.92c.518 0 .87-.343.87-.85v-1.465c0-.508-.352-.85-.87-.85H5.068c-.517 0-.869.342-.869.85Z" />
                </g>
              </svg>
              Press Add to Dock
            </Space>
            <Typography.Text>Requires macOS Sonoma or later.</Typography.Text>
            <Typography.Text>
              On older versions of macOS, install the latest version of the Chrome, Edge, or Opera
              web browser and click the <Typography.Text strong>Install</Typography.Text> button.
            </Typography.Text>
          </Space>
        </Col>
      </Row>
    </Flex>
  );
};
