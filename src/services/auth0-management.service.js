const axios = require('axios');

const domain = process.env.AUTH0_DOMAIN;
const clientId = process.env.AUTH0_MGMT_CLIENT_ID;
const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiresAt = 0;

const getManagementToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const response = await axios.post(
    `https://${domain}/oauth/token`,
    {
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: 'client_credentials'
    }
  );

  cachedToken = response.data.access_token;

  tokenExpiresAt =
    Date.now() + (response.data.expires_in - 60) * 1000;

  return cachedToken;
};

const getUsers = async () => {
  const token = await getManagementToken();

  const response = await axios.get(
    `https://${domain}/api/v2/users`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 0,
        per_page: 100
      }
    }
  );

  return response.data;
};

const updateUser = async (userId, data) => {
  const token = await getManagementToken();

  const response = await axios.patch(
    `https://${domain}/api/v2/users/${encodeURIComponent(userId)}`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

const deleteUser = async (userId) => {
  const token = await getManagementToken();

  await axios.delete(
    `https://${domain}/api/v2/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

const createUser = async (data) => {
  const token = await getManagementToken();

  const response = await axios.post(
    `https://${domain}/api/v2/users`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser
};