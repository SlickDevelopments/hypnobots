const _spies = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
};

module.exports = class Heroku {
  post = _spies.post;
  get = _spies.get;
  delete = _spies.delete;
};

module.exports._spies = _spies;
