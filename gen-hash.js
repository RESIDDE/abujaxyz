const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin12345', 12);
console.log(hash);
