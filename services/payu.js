const axios = require("axios");

let accessToken = null;

//function to retreive token from API using client ID
async function getAccessToken() {
  const creds = Buffer.from(
    `${process.env.PAYU_CLIENT_ID}:${process.env.PAYU_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    `${process.env.PAYU_API_URL}/pl/standard/user/oauth/authorize`,
    null,
    {
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      params: {
        grant_type: "client_credentials",
      },
    }
  );

  accessToken = response.data.access_token;

  return accessToken;
}

async function createOrder(orderData) {
  if (!accessToken) {
    await getAccessToken();
  }

  const response = await axios.post(
    `${process.env.PAYU_API_URL}/api/v2_1/orders`,
    orderData, // The order details (must match PayU’s required format)
    {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Auth header with Bearer token
        "Content-Type": "application/json", // Sending JSON payload
      },
    }
  );

  // Return the response data (order ID, status, etc.)
  return response.data;
}

// Export the functions so they can be used in other parts of your app
module.exports = {
  getAccessToken,
  createOrder,
};
