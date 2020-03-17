import Sequelize from 'sequelize';
import { logError } from './logger';
import db from '../db';
import { FCMDeviceGroup } from './notification';

const Op = Sequelize.Op;

export const authToken = async (tokenId = '') => {
  if (!tokenId) {
    return false;
  }

  const token = await db.tables.Auth.findOne({
    where: {
      token: tokenId,
      isDeleted: {
        [Op.is]: null
      }
    }
  });

  return token || false;
};

export const createToken = async (
  UID = '',
  device = '',
  IP = '',
  deviceToken = ''
) => {
  try {
    if (deviceToken) {
      const hasDeviceToken = await db.tables.Auth.findOne({
        where: {
          deviceToken
        }
      });
      if (hasDeviceToken) {
        await revokeToken(hasDeviceToken.token);
      }
    }

    const token = await db.tables.Auth.create({
      token: '',
      UID,
      device,
      deviceToken,
      IP
    });

    if (deviceToken) {
      await FCMDeviceGroup(UID, deviceToken, 'add');
    }

    return token.dataValues.token;
  } catch (e) {
    logError(e);
    throw e;
  }
};

export const revokeToken = async (token = '') => {
  try {
    const auth = await db.tables.Auth.findOne({ where: { token } });
    await auth.update({ isDeleted: new Date() });
    if (auth.deviceToken) {
      await FCMDeviceGroup(auth.UID, auth.deviceToken, 'remove');
    }
  } catch (e) {
    logError(e);
    throw e;
  }

  return true;
};

export const revokeAll = async () => {
  try {
    await db.tables.Auth.update(
      { isDeleted: new Date() },
      {
        where: {
          isDeleted: {
            [Op.is]: null
          }
        }
      }
    );
    await db.tables.FCMGroup.destroy({
      where: {}
    });
  } catch (e) {
    logError(e);
    throw e;
  }

  return true;
};
