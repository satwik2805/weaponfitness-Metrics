const Brevo = require("@getbrevo/brevo");

const brevoApi = new Brevo.TransactionalEmailsApi();
brevoApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

module.exports = brevoApi;
