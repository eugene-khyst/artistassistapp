/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Button, Col, Flex, Form, Input, Row, Space, theme, Tooltip, Typography} from 'antd';
import type {RefObject} from 'react';
import {type ChangeEvent, useEffect, useRef} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {ImageCard} from '~/src/components/image/ImageCard';
import type {Score} from '~/src/services/rating';
import {Player} from '~/src/services/rating';
import {useAppStore} from '~/src/stores/app-store';

function restartBlurAnimation(...refs: RefObject<HTMLDivElement>[]) {
  refs.forEach((ref: RefObject<HTMLDivElement>) => {
    const classList: DOMTokenList | undefined = ref.current?.classList;
    classList?.remove('blur-animation');
    setTimeout(() => classList?.add('blur-animation'), 1);
  });
}

export const ImagesCompare: React.FC = () => {
  const nextGame = useAppStore(state => state.nextGame);
  const unfinishedGamesSize = useAppStore(state => state.unfinishedGamesSize);
  const playersByRating = useAppStore(state => state.playersByRating);
  const addPlayer = useAppStore(state => state.addPlayer);
  const setScore = useAppStore(state => state.setScore);
  const newTournament = useAppStore(state => state.newTournament);

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const player1Ref = useRef<HTMLDivElement>(null);
  const player2Ref = useRef<HTMLDivElement>(null);
  const photoRankingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (unfinishedGamesSize === 0) {
      photoRankingRef.current?.scrollIntoView();
    }
  }, [unfinishedGamesSize]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    for (const file of e.target.files ?? []) {
      addPlayer(new Player<File>(file));
    }
  };

  const handlePlayerClick = (score: Score) => {
    setScore(score);
    restartBlurAnimation(player1Ref, player2Ref);
  };

  return (
    <Flex vertical gap="middle" style={{padding: '0 16px 16px'}}>
      <Space size="small" align="center">
        <Typography.Text strong>Select photos to rank using pairwise comparison</Typography.Text>
        <Tooltip title="It can be difficult to choose between multiple photos. Comparing each photo with others in pairs simplifies the choice and helps to identify the most preferred one.">
          <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
        </Tooltip>
      </Space>

      <Space size="small" align="center">
        <Form.Item style={{marginBottom: 0}}>
          <Input type="file" size="large" onChange={handleFileChange} accept="image/*" multiple />
        </Form.Item>
        <Button onClick={() => newTournament()} disabled={playersByRating.length === 0}>
          New comparison
        </Button>
      </Space>
      {nextGame && (
        <>
          <Typography.Text strong>Determine the best photo by pairwise comparison</Typography.Text>
          <Row gutter={16} align="middle" justify="space-evenly">
            <Col xs={12} lg={8} xl={6}>
              <ImageCard
                ref={player1Ref}
                file={nextGame.player1.data}
                description={`Rating: ${nextGame.player1.rating.toFixed(1)}`}
                onClick={() => handlePlayerClick([1, 0])}
                hoverable
              />
            </Col>
            <Col xs={12} lg={8} xl={6}>
              <ImageCard
                ref={player2Ref}
                file={nextGame.player2.data}
                description={`Rating: ${nextGame.player2.rating.toFixed(1)}`}
                onClick={() => handlePlayerClick([0, 1])}
                hoverable
              />
            </Col>
          </Row>
          <Typography.Text>Left to compare: {unfinishedGamesSize}</Typography.Text>
        </>
      )}

      {playersByRating.length > 0 && (
        <>
          <Typography.Text ref={photoRankingRef} strong>
            Photo ranking
          </Typography.Text>
          <Row gutter={[16, 16]} align="middle" justify="start">
            {playersByRating.map(({id, data, rating}: Player<File>, index: number) => (
              <Col key={`${id}`} xs={12} md={8} lg={6}>
                <ImageCard
                  file={data}
                  description={
                    <>
                      Position: {index + 1}
                      <br />
                      Rating: {rating.toFixed(1)}
                    </>
                  }
                />
              </Col>
            ))}
          </Row>
        </>
      )}

      <Row justify="start">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>
    </Flex>
  );
};
