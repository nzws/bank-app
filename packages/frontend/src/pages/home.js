import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  SectionList,
  Button,
  Text,
  ScrollView,
  Alert
} from 'react-native';
import { Tab, Tabs, ScrollableTab } from 'native-base';
import styled from 'styled-components/native';
import { useNavigation } from '@react-navigation/native';

import { Center, HeadMargin, Title } from '../components/styles/layout';
import LogBlock from '../components/home/log-block';
import LogTitle from '../components/home/log-title';
import api from '../utils/api';
import MainFooter from '../components/footer';
import { currencyToString } from '../utils/currency';
import shadow from '../components/styles/shadow';
import Container from '../components/container';
import updateStatus from '../utils/status';
import Card from '../components/home/card';
import { theme } from '../../App';

const Main = styled(View)({
  paddingLeft: 20,
  paddingRight: 20,
  marginBottom: 20
});

const HeadBlock = styled(Center)({
  background: '#fff',
  ...shadow(10)
});

const Desc = styled(Text)({
  fontSize: 15,
  color: '#a2a2a2',
  marginTop: 10,
  marginBottom: ({ isStatus }) => (isStatus ? 5 : 0)
});

const Status = styled(Text)({
  color: ({ running, theme: { primary, danger } }) =>
    running ? primary : danger
});

const Balance = styled(Text)({
  fontSize: 35,
  marginBottom: 10
});

const Home = ({ bank: { bankId, bank, display_name } }) => {
  const nav = useNavigation();
  let {
    status: [status, setStatus]
  } = Container.useContainer();
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  let [data, setData] = useState('{}');
  data = JSON.parse(data);

  const restart = () => {
    Alert.alert('Restart updater', 'Are you sure?', [
      {
        text: 'Cancel'
      },
      {
        text: 'OK',
        onPress: () => {
          api({
            path: 'api/restart_updater',
            method: 'POST',
            data: {
              bankId
            }
          });
        }
      }
    ]);
  };

  const load = async pageId => {
    setIsLoading(true);
    await updateStatus(setStatus);
    const apiData = await api({
      path: 'api/history',
      method: 'POST',
      data: {
        page: pageId || page,
        bankId: bankId === 'all' ? null : bankId
      }
    });

    if (apiData.result[0]) {
      const newData = pageId ? {} : JSON.parse(JSON.stringify(data));
      apiData.result.forEach(v => {
        const day = new Date(v.date).toLocaleDateString('en-us');

        if (!newData[day]) {
          newData[day] = [];
        }
        newData[day].unshift(v);
      });
      setData(JSON.stringify(newData));
      setHasNext(true);
    } else {
      setHasNext(false);
    }

    setIsLoading(false);
    setPage(prev => (pageId || prev) + 1);
  };

  useEffect(() => {
    load();
  }, []);

  let balance;
  const bankStatus = status[bankId];
  const lastUpdate = bankStatus
    ? new Date(bankStatus.lastUpdatedAt).toLocaleTimeString()
    : '';
  if (Object.keys(status)[0]) {
    balance =
      bankId === 'all'
        ? Object.values(status)
            .map(v => v.balance)
            .reduce((a, c) => a + c, 0)
        : bankStatus.balance;
  }

  return (
    <ScrollView>
      <HeadBlock>
        <Card bank={bank} display_name={display_name} />

        {bankId !== 'all' && (
          <Desc isStatus>
            <Status running={bankStatus.running}>
              {bankStatus.running ? 'Running' : 'Stopping'}
            </Status>
            {` | Last update: ${lastUpdate}`}
          </Desc>
        )}

        <Desc>Balance</Desc>
        <Balance>
          {balance !== undefined ? currencyToString(balance) : 'Loading...'}
        </Balance>

        {bankId !== 'all' && !bankStatus.running && (
          <Button
            color={theme.warning}
            title="Restart updater"
            onPress={restart}
          />
        )}
        {bank === 'rakuten' && (
          <View style={{ marginTop: 10 }}>
            <Button
              color={theme.success}
              title="Deposit from jp-bank"
              onPress={() => nav.navigate('DepositToRakuten', { bankId })}
            />
          </View>
        )}
      </HeadBlock>

      <Center>
        <Title fontSize={30}>History</Title>
      </Center>

      <Main>
        <SectionList
          sections={Object.keys(data).map(key => ({
            date: new Date(data[key][0].date),
            data: data[key]
          }))}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => <LogBlock item={item} />}
          renderSectionHeader={({ section }) => <LogTitle section={section} />}
          refreshing={isLoading}
          onRefresh={() => load(0)}
        />

        {hasNext && (
          <Button
            title="Load More"
            onPress={() => load()}
            disabled={isLoading}
          />
        )}
      </Main>
    </ScrollView>
  );
};
Home.propTypes = {
  bank: PropTypes.object
};

const HomeTab = () => {
  let {
    status: [status]
  } = Container.useContainer();

  return (
    <MainFooter now="Home" noContent>
      <Tabs
        renderTabBar={() => <ScrollableTab />}
        style={{ marginTop: HeadMargin }}
      >
        <Tab heading="All">
          <Home
            bank={{
              bankId: 'all',
              bank: 'all'
            }}
          />
        </Tab>
        {Object.values(status).map(v => (
          <Tab heading={v.display_name} key={v.bankId}>
            <Home bank={v} />
          </Tab>
        ))}
      </Tabs>
    </MainFooter>
  );
};

export default HomeTab;
