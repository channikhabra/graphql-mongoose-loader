// @flow'

import {
  clearDbAndRestartCounters,
  connectMongooseAndPopulate,
  disconnectMongoose,
  createUser,
} from '../../test/helpers';

import connectionFromMongoCursor, { offsetToCursor } from '../ConnectionFromMongoCursor';
import UserModel from '../../test/fixtures/UserModel';

beforeAll(connectMongooseAndPopulate);

beforeEach(clearDbAndRestartCounters);

afterAll(disconnectMongoose);

it('should return connection from mongo cursor', async () => {
  const userA = await createUser();
  const userB = await createUser();
  const userC = await createUser();
  const userD = await createUser();

  const cursor = UserModel.find();
  const context = {
    // got it throwing a 🎲
    randomValue: 2,
  };

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const argsFirstPage = { first: 2 };

  const resultFirstPage = await connectionFromMongoCursor({
    cursor,
    context,
    args: argsFirstPage,
    loader,
  });

  expect(loader).toHaveBeenCalledTimes(2);
  expect(loader.mock.calls[0]).toEqual([context, userA._id]);
  expect(loader.mock.calls[1]).toEqual([context, userB._id]);
  expect(resultFirstPage).toMatchSnapshot();

  // second page

  const argsSecondPage = { after: resultFirstPage.pageInfo.endCursor };

  const resultSecondPage = await connectionFromMongoCursor({
    cursor,
    context,
    args: argsSecondPage,
    loader,
  });

  expect(loader).toHaveBeenCalledTimes(4);
  expect(loader.mock.calls[2]).toEqual([context, userC._id]);
  expect(loader.mock.calls[3]).toEqual([context, userD._id]);
  expect(resultSecondPage).toMatchSnapshot();
});

it('should work with empty args', async () => {
  const userA = await createUser();
  await createUser();
  await createUser();
  await createUser();

  const cursor = UserModel.find();
  const context = {
    // got it throwing a 🎲
    randomValue: 2,
  };

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const args = {};

  const result = await connectionFromMongoCursor({
    cursor,
    context,
    args,
    loader,
  });

  expect(loader).toHaveBeenCalledTimes(4);
  expect(loader.mock.calls[0]).toEqual([context, userA._id]);
  expect(result).toMatchSnapshot();
});

it('should work with empty args and empty result', async () => {
  const cursor = UserModel.find();
  const context = {
    // got it throwing a 🎲
    randomValue: 2,
  };

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const args = {};

  const result = await connectionFromMongoCursor({
    cursor,
    context,
    args,
    loader,
  });

  expect(loader).not.toHaveBeenCalled();
  expect(result).toMatchSnapshot();
});

it('should return connection from mongo cursor using raw', async () => {
  const userA = await createUser();
  await createUser();
  await createUser();
  await createUser();

  const cursor = UserModel.find();
  const context = {
    // got it throwing a 🎲
    randomValue: 2,
  };

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const argsFirstPage = { first: 2 };

  const resultFirstPage = await connectionFromMongoCursor({
    cursor,
    context,
    args: argsFirstPage,
    loader,
    raw: true,
  });

  expect(loader).toHaveBeenCalledTimes(2);
  expect(loader.mock.calls[0][1].name).toEqual(userA.name);
  expect(resultFirstPage).toMatchSnapshot();
});

it('should return connection from mongo cursor using first 1 and last as null', async () => {
  await createUser();
  await createUser();
  await createUser();
  await createUser();

  const cursor = UserModel.find();
  const context = {
    // got it throwing a 🎲
    randomValue: 2,
  };

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const argsFirstPage = {
    first: 1,
    before: null,
    last: null,
    after: null,
    search: '',
  };

  const resultFirstPage = await connectionFromMongoCursor({
    cursor,
    context,
    args: argsFirstPage,
    loader,
    raw: true,
  });

  expect(resultFirstPage.edges.length).toBe(1);
  expect(loader).toHaveBeenCalledTimes(1);
});

it('should not send the entire collection when before offset is 0', async () => {
  await Promise.all(Array.from({ length: 50 }).map(createUser));

  const cursor = UserModel.find();
  const context = {};

  const loader = jest.fn();
  loader.mockReturnValue('user');

  const args1 = {
    before: offsetToCursor(0),
  };

  const args2 = {
    before: offsetToCursor(0),
    last: 9,
  };

  const resultArgs1 = await connectionFromMongoCursor({
    cursor,
    context,
    args: args1,
    loader,
  });
  const resultArgs2 = await connectionFromMongoCursor({
    cursor,
    context,
    args: args2,
    loader,
  });

  expect(resultArgs1.edges.length).not.toBe(50);
  expect(resultArgs2.edges.length).not.toBe(50);

  expect(resultArgs1.edges.length).toBe(10);
  expect(resultArgs2.edges.length).toBe(9);
});
