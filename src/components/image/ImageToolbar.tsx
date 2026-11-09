/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {DownloadOutlined, MoreOutlined, PictureOutlined, PrinterOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  Button,
  type ButtonProps,
  Divider,
  Dropdown,
  Flex,
  type MenuProps,
  Popover,
  Space,
  Tooltip,
} from 'antd';
import {clsx} from 'clsx';
import {Fragment, type ReactNode} from 'react';

import {ImageSaveButton} from '@/components/image/ImageSaveButton';
import {useCollapseLevel} from '@/hooks/useCollapseLevel';

import styles from './ImageToolbar.module.css';

interface ButtonItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  type?: ButtonProps['type'];
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
}

type ActionItem =
  | (ButtonItem & {panel?: never})
  | (Omit<ButtonItem, 'onClick'> & {panel: ReactNode; onClick?: never});

type ActionGroup = [ButtonItem, ...ButtonItem[]];

interface ImageActions {
  print: () => void;
  save: () => Promise<void> | void;
  setAsReference?: () => Promise<void> | void;
  disabled?: boolean;
}

interface CollapsibleAction {
  key: string;
  node: ReactNode;
  menuItems: NonNullable<MenuProps['items']>;
  panel?: ReactNode;
  isGroup?: boolean;
  disabled?: boolean;
}

interface Props {
  extraContent?: {before?: ReactNode; after?: ReactNode};
  actions?: (ActionItem | ActionGroup)[];
  imageActions?: ImageActions;
  className?: string;
}

function renderButton({key, label, icon, type, tooltip, onClick, disabled}: ButtonItem) {
  return (
    <Tooltip key={key} title={tooltip}>
      <Button icon={icon} type={type} onClick={onClick} disabled={disabled}>
        {label}
      </Button>
    </Tooltip>
  );
}

function toMenuItem({key, label, icon, tooltip, onClick, disabled}: ButtonItem) {
  return {key, label, icon, title: tooltip, onClick, disabled};
}

function toCollapsibleAction(action: ActionItem | ActionGroup): CollapsibleAction {
  if (Array.isArray(action)) {
    return {
      key: action[0].key,
      node: <Space.Compact>{action.map(renderButton)}</Space.Compact>,
      menuItems: action.map(toMenuItem),
      isGroup: true,
      disabled: action.every(({disabled}) => disabled),
    };
  }
  const panel = action.disabled ? undefined : action.panel;
  return {
    key: action.key,
    node: renderButton(action),
    menuItems: panel ? [] : [toMenuItem(action)],
    panel,
    disabled: action.disabled,
  };
}

export function ImageToolbar({
  extraContent,
  actions = [],
  imageActions,
  className,
}: Readonly<Props>) {
  const {t} = useLingui();

  const collapsibleActions: CollapsibleAction[] = actions.map(toCollapsibleAction);
  if (imageActions) {
    const {print, save, setAsReference, disabled} = imageActions;
    collapsibleActions.push(
      toCollapsibleAction({
        key: 'print',
        label: <Trans>Print</Trans>,
        icon: <PrinterOutlined />,
        onClick: print,
        disabled,
      }),
      {
        key: 'save',
        node: (
          <ImageSaveButton onSave={save} onSetAsReference={setAsReference} disabled={disabled} />
        ),
        menuItems: [
          {
            key: 'save',
            label: <Trans>Save</Trans>,
            icon: <DownloadOutlined />,
            onClick: () => {
              void save();
            },
            disabled,
          },
          ...(setAsReference
            ? [
                {
                  key: 'set-as-reference',
                  label: <Trans>Set as reference</Trans>,
                  icon: <PictureOutlined />,
                  onClick: () => {
                    void setAsReference();
                  },
                  disabled,
                },
              ]
            : []),
        ],
        disabled,
      }
    );
  }

  const {ref, collapseLevel} = useCollapseLevel<HTMLDivElement>(collapsibleActions.length);

  const visibleCount = collapsibleActions.length - collapseLevel;
  const collapsedActions = collapsibleActions.slice(visibleCount);
  const menuItems = collapsedActions.flatMap(({menuItems, isGroup}, index, {length}) =>
    isGroup && index < length - 1 ? [...menuItems, {type: 'divider' as const}] : menuItems
  );
  const panels = collapsedActions.filter(({panel}) => !!panel);

  return (
    <Flex align="center" gap="small" className={clsx(styles['toolbar'], className)}>
      {extraContent?.before}
      <Flex ref={ref} align="center" gap="small" className={styles['actions']}>
        {collapsibleActions.map(({key, node, panel}, index) => {
          const isCollapsed = index >= visibleCount;
          return (
            <Flex key={key} className={isCollapsed ? styles['collapsed'] : undefined}>
              {panel && !isCollapsed ? (
                <Popover trigger="click" content={panel}>
                  {node}
                </Popover>
              ) : (
                node
              )}
            </Flex>
          );
        })}
        <Dropdown
          trigger={['click']}
          open={collapseLevel > 0 ? undefined : false}
          menu={{
            items: menuItems,
            selectedKeys: actions
              .flat()
              .filter(({type}) => type === 'primary')
              .map(({key}) => key),
          }}
          popupRender={menu => (
            <div className="u-popup-panel">
              {menuItems.length > 0 && menu}
              {panels.map(({key, panel}, index) => (
                <Fragment key={key}>
                  {(index > 0 || menuItems.length > 0) && <Divider className="u-m-0" />}
                  <div className="u-popup-content">{panel}</div>
                </Fragment>
              ))}
            </div>
          )}
        >
          <Button
            icon={<MoreOutlined />}
            aria-label={t`More actions`}
            disabled={collapsedActions.every(({disabled}) => disabled)}
            className={collapseLevel > 0 ? undefined : styles['collapsed']}
          />
        </Dropdown>
        {extraContent?.after}
      </Flex>
    </Flex>
  );
}
