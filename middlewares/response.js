// Standar respon: { code, message, data }
const DEFAULT_MSG = {
  200: 'OK',
  201: 'CREATED',
  202: 'ACCEPTED',
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_SERVER_ERROR'
};

module.exports = function responseWrapper(req, res, next) {
  res.reply = (code = 200, data = {}, message = DEFAULT_MSG[code] || 'OK') => {
    return res.status(code).json({ code, message, data });
  };

  res.ok       = (data = {}, message = DEFAULT_MSG[200]) => res.reply(200, data, message);
  res.created  = (data = {}, message = DEFAULT_MSG[201]) => res.reply(201, data, message);
  res.accepted = (data = {}, message = DEFAULT_MSG[202]) => res.reply(202, data, message);
  res.badRequest   = (message = DEFAULT_MSG[400], data = {}) => res.reply(400, data, message);
  res.unauthorized = (message = DEFAULT_MSG[401], data = {}) => res.reply(401, data, message);
  res.forbidden    = (message = DEFAULT_MSG[403], data = {}) => res.reply(403, data, message);
  res.notFound     = (message = DEFAULT_MSG[404], data = {}) => res.reply(404, data, message);
  res.conflict     = (message = DEFAULT_MSG[409], data = {}) => res.reply(409, data, message);
  res.unprocessable= (message = DEFAULT_MSG[422], data = {}) => res.reply(422, data, message);
  res.error        = (message = DEFAULT_MSG[500], data = {}, code = 500) => res.reply(code, data, message);

  next();
};
